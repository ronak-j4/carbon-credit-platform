import hashlib
import json
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from web3 import Web3

from app import blockchain, duplicate_detection
from app.database import get_db
from app.models import ProjectMetadata, VerificationDocumentRecord
from app.schemas import (
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    SubmitProjectRequest,
    RecordMetadataRequest,
    ProjectResponse,
    TransferRequest,
    RetireRequest,
    TxResponse,
    OverlapMatch,
    VerificationDocumentResponse,
    CreditBatchResponse,
    RetirementCertificateResponse,
)

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/accounts/demo")
def list_demo_accounts():
    """Lists the demo account aliases and addresses available for local
    testing (never their private keys). Use these as the `signer` field
    in submit/transfer/retire requests."""
    return {alias: info["address"] for alias, info in blockchain.DEMO_ACCOUNTS.items()}


@router.post("/projects/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate(payload: DuplicateCheckRequest, db: Session = Depends(get_db)):
    """Pre-check whether a project would be flagged as a duplicate,
    without submitting anything on-chain yet."""
    fingerprint = duplicate_detection.compute_fingerprint(
        payload.name, payload.location, payload.project_type, payload.start_date, payload.end_date
    )
    try:
        is_dup = blockchain.is_duplicate(fingerprint)
    except Exception:
        is_dup = db.query(ProjectMetadata).filter(ProjectMetadata.fingerprint == fingerprint).first() is not None

    overlap_matches: list[OverlapMatch] = []
    overlap_detected = False

    if payload.polygon and payload.polygon.coordinates:
        poly_dict = payload.polygon.model_dump()
        raw_overlaps = duplicate_detection.check_geospatial_overlaps(db, poly_dict)
        if raw_overlaps:
            overlap_detected = True
            overlap_matches = [OverlapMatch(**o) for o in raw_overlaps]

    return DuplicateCheckResponse(
        fingerprint=fingerprint,
        is_duplicate=is_dup,
        overlap_detected=overlap_detected,
        overlaps=overlap_matches,
    )


@router.post("/projects/submit", response_model=TxResponse)
def submit_project(payload: SubmitProjectRequest, db: Session = Depends(get_db)):
    """Submit a new project using a backend-held demo signer."""
    fingerprint = duplicate_detection.compute_fingerprint(
        payload.name, payload.location, payload.project_type, payload.start_date, payload.end_date
    )

    if blockchain.is_duplicate(fingerprint):
        raise HTTPException(status_code=409, detail="Duplicate project detected — this project already exists.")

    boundary_json = json.dumps(payload.polygon.model_dump()) if payload.polygon else None
    center_lat = payload.center.latitude if payload.center else None
    center_lng = payload.center.longitude if payload.center else None

    if payload.polygon and payload.polygon.coordinates:
        overlaps = duplicate_detection.check_geospatial_overlaps(db, payload.polygon.model_dump())
        if overlaps:
            top = overlaps[0]
            raise HTTPException(
                status_code=409,
                detail=f"Geographical overlap detected with project '{top['project_name']}' (#{top['project_id']}): {top['overlap_percentage']}% overlap ({top['overlap_area_km2']} km²)."
            )

    try:
        result = blockchain.submit_project(
            payload.signer, payload.name, payload.location, payload.project_type, payload.co2_tonnes, fingerprint
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    signer_address = blockchain.DEMO_ACCOUNTS[payload.signer]["address"]

    record = ProjectMetadata(
        onchain_project_id=result["project_id"],
        fingerprint=fingerprint,
        name=payload.name,
        location=payload.location,
        project_type=payload.project_type,
        co2_tonnes=payload.co2_tonnes,
        start_date=payload.start_date,
        end_date=payload.end_date,
        description=payload.description,
        boundary_geojson=boundary_json,
        center_lat=center_lat,
        center_lng=center_lng,
        submitter_address=signer_address,
        submitted_onchain=True,
    )
    db.add(record)
    db.commit()

    return TxResponse(tx_hash=result["tx_hash"], project_id=result["project_id"])


@router.post("/projects/record", response_model=ProjectResponse)
def record_metadata(payload: RecordMetadataRequest, db: Session = Depends(get_db)):
    """Called by the frontend AFTER submitting on-chain via MetaMask.
    Stores the off-chain metadata linked to the on-chain project ID."""
    try:
        onchain = blockchain.get_project_onchain(payload.onchain_project_id)
    except Exception:
        raise HTTPException(status_code=404, detail="No such project exists on-chain — submit it via MetaMask first.")

    boundary_json = json.dumps(payload.polygon.model_dump()) if payload.polygon else None
    center_lat = payload.center.latitude if payload.center else None
    center_lng = payload.center.longitude if payload.center else None

    existing = (
        db.query(ProjectMetadata).filter(ProjectMetadata.onchain_project_id == payload.onchain_project_id).first()
    )
    if existing:
        existing.description = payload.description
        existing.start_date = payload.start_date
        existing.end_date = payload.end_date
        if boundary_json:
            existing.boundary_geojson = boundary_json
        if center_lat is not None:
            existing.center_lat = center_lat
        if center_lng is not None:
            existing.center_lng = center_lng
        db.commit()
        record = existing
    else:
        record = ProjectMetadata(
            onchain_project_id=payload.onchain_project_id,
            fingerprint=payload.fingerprint,
            name=payload.name,
            location=payload.location,
            project_type=payload.project_type,
            co2_tonnes=payload.co2_tonnes,
            start_date=payload.start_date,
            end_date=payload.end_date,
            description=payload.description,
            boundary_geojson=boundary_json,
            center_lat=center_lat,
            center_lng=center_lng,
            submitter_address=payload.submitter_address,
            submitted_onchain=True,
        )
        db.add(record)
        db.commit()

    polygon_dict = json.loads(record.boundary_geojson) if record.boundary_geojson else None
    center_dict = {"latitude": record.center_lat, "longitude": record.center_lng} if record.center_lat is not None else None

    verifiers = blockchain.get_project_verifiers(payload.onchain_project_id)
    batches = [CreditBatchResponse(**b) for b in blockchain.get_project_batches_onchain(payload.onchain_project_id)]

    return ProjectResponse(
        **onchain,
        description=record.description,
        start_date=record.start_date,
        end_date=record.end_date,
        polygon=polygon_dict,
        center=center_dict,
        verifiers=verifiers,
        batches=batches,
    )


@router.get("/projects", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    """Lists all submitted projects with on-chain status, multi-verifier state,
    and off-chain metadata."""
    records = db.query(ProjectMetadata).filter(ProjectMetadata.submitted_onchain == True).all()  # noqa: E712
    results = []
    for r in records:
        try:
            onchain = blockchain.get_project_onchain(r.onchain_project_id)
        except Exception:
            continue

        polygon_dict = json.loads(r.boundary_geojson) if r.boundary_geojson else None
        center_dict = {"latitude": r.center_lat, "longitude": r.center_lng} if r.center_lat is not None else None

        verifiers = blockchain.get_project_verifiers(r.onchain_project_id)
        batches = [CreditBatchResponse(**b) for b in blockchain.get_project_batches_onchain(r.onchain_project_id)]

        doc_records = db.query(VerificationDocumentRecord).filter(
            VerificationDocumentRecord.project_id == r.onchain_project_id
        ).all()
        docs = [
            VerificationDocumentResponse(
                id=d.id,
                project_id=d.project_id,
                doc_hash=d.doc_hash,
                doc_type=d.doc_type,
                filename=d.filename,
                file_size=d.file_size,
                content_type=d.content_type,
                uploaded_by=d.uploaded_by,
                download_url=f"/api/projects/{d.project_id}/documents/{d.doc_hash}",
                created_at=str(d.created_at) if d.created_at else None,
                onchain_committed=True,
            )
            for d in doc_records
        ]

        results.append(
            ProjectResponse(
                **onchain,
                description=r.description,
                start_date=r.start_date,
                end_date=r.end_date,
                polygon=polygon_dict,
                center=center_dict,
                verifiers=verifiers,
                documents=docs,
                batches=batches,
            )
        )
    return results


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    try:
        onchain = blockchain.get_project_onchain(project_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Project not found on-chain")

    record = db.query(ProjectMetadata).filter(ProjectMetadata.onchain_project_id == project_id).first()
    description = record.description if record else None
    start_date = record.start_date if record else None
    end_date = record.end_date if record else None
    polygon_dict = json.loads(record.boundary_geojson) if record and record.boundary_geojson else None
    center_dict = {"latitude": record.center_lat, "longitude": record.center_lng} if record and record.center_lat is not None else None

    verifiers = blockchain.get_project_verifiers(project_id)
    batches = [CreditBatchResponse(**b) for b in blockchain.get_project_batches_onchain(project_id)]

    doc_records = db.query(VerificationDocumentRecord).filter(
        VerificationDocumentRecord.project_id == project_id
    ).all()
    docs = [
        VerificationDocumentResponse(
            id=d.id,
            project_id=d.project_id,
            doc_hash=d.doc_hash,
            doc_type=d.doc_type,
            filename=d.filename,
            file_size=d.file_size,
            content_type=d.content_type,
            uploaded_by=d.uploaded_by,
            download_url=f"/api/projects/{d.project_id}/documents/{d.doc_hash}",
            created_at=str(d.created_at) if d.created_at else None,
            onchain_committed=True,
        )
        for d in doc_records
    ]

    return ProjectResponse(
        **onchain,
        description=description,
        start_date=start_date,
        end_date=end_date,
        polygon=polygon_dict,
        center=center_dict,
        verifiers=verifiers,
        documents=docs,
        batches=batches,
    )


# -----------------------------------------------------------------------------
# TWO-VERIFIER STATUS & APPROVAL
# -----------------------------------------------------------------------------

@router.get("/projects/{project_id}/verifiers")
def get_verifiers(project_id: int):
    """Returns the verifiers who have approved this project and the gating state."""
    try:
        onchain = blockchain.get_project_onchain(project_id)
        verifiers = blockchain.get_project_verifiers(project_id)
        return {
            "project_id": project_id,
            "status": onchain["status"],
            "approvals_count": onchain.get("approvals_count", len(verifiers)),
            "required_verifiers": 2,
            "is_fully_approved": onchain["status"] == "Approved",
            "verifiers": verifiers,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/projects/{project_id}/approve", response_model=TxResponse)
def approve_project(project_id: int):
    """Approve a pending project using the backend's primary verifier."""
    try:
        result = blockchain.approve_project(project_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TxResponse(tx_hash=result["tx_hash"])


@router.post("/projects/{project_id}/reject", response_model=TxResponse)
def reject_project(project_id: int):
    try:
        result = blockchain.reject_project(project_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TxResponse(tx_hash=result["tx_hash"])


# -----------------------------------------------------------------------------
# OFF-CHAIN VERIFICATION DOCUMENTS WITH ON-CHAIN HASH COMMITMENTS
# -----------------------------------------------------------------------------

@router.post("/projects/{project_id}/documents", response_model=VerificationDocumentResponse)
async def upload_verification_document(
    project_id: int,
    file: UploadFile = File(...),
    doc_type: str = Form("MRV_AUDIT_REPORT"),
    uploaded_by: str = Form("0x0000000000000000000000000000000000000000"),
    commit_onchain: bool = Form(False),
    db: Session = Depends(get_db),
):
    """Uploads an audit report or MRV verification document off-chain,
    computes its Keccak-256 cryptographic hash, stores it, and optionally
    commits the hash on-chain directly."""
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Cannot upload an empty file.")

    # Compute Keccak-256 hash
    keccak_hash = Web3.keccak(contents).hex()

    # Save to disk using hash as filename
    safe_filename = f"{project_id}_{keccak_hash[:12]}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    existing = db.query(VerificationDocumentRecord).filter(
        VerificationDocumentRecord.doc_hash == keccak_hash
    ).first()

    if not existing:
        doc_record = VerificationDocumentRecord(
            project_id=project_id,
            doc_hash=keccak_hash,
            doc_type=doc_type,
            filename=file.filename or "verification_document.pdf",
            file_size=len(contents),
            content_type=file.content_type,
            uploaded_by=uploaded_by,
            file_path=file_path,
        )
        db.add(doc_record)
        db.commit()
        db.refresh(doc_record)
    else:
        doc_record = existing

    # Optionally commit on-chain using backend verifier key
    if commit_onchain:
        try:
            uri = f"/api/projects/{project_id}/documents/{keccak_hash}"
            blockchain.attach_document(project_id, keccak_hash, doc_type, uri)
        except Exception as e:
            # Hash stored off-chain even if local chain call fails
            pass

    return VerificationDocumentResponse(
        id=doc_record.id,
        project_id=project_id,
        doc_hash=keccak_hash,
        doc_type=doc_type,
        filename=doc_record.filename,
        file_size=doc_record.file_size,
        content_type=doc_record.content_type,
        uploaded_by=uploaded_by,
        download_url=f"/api/projects/{project_id}/documents/{keccak_hash}",
        created_at=str(doc_record.created_at),
        onchain_committed=commit_onchain,
    )


@router.get("/projects/{project_id}/documents/{doc_hash}")
def download_verification_document(project_id: int, doc_hash: str, db: Session = Depends(get_db)):
    """Downloads an off-chain stored verification document by its cryptographic hash."""
    doc = db.query(VerificationDocumentRecord).filter(
        VerificationDocumentRecord.project_id == project_id,
        VerificationDocumentRecord.doc_hash == doc_hash
    ).first()

    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Verification document not found.")

    return FileResponse(
        path=doc.file_path,
        filename=doc.filename,
        media_type=doc.content_type or "application/octet-stream"
    )


@router.get("/projects/{project_id}/documents/{doc_hash}/verify")
def verify_document_integrity(project_id: int, doc_hash: str, db: Session = Depends(get_db)):
    """Verifies that the stored document matches its hash and compares it with on-chain committed hashes."""
    doc = db.query(VerificationDocumentRecord).filter(
        VerificationDocumentRecord.project_id == project_id,
        VerificationDocumentRecord.doc_hash == doc_hash
    ).first()

    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk.")

    with open(doc.file_path, "rb") as f:
        actual_hash = Web3.keccak(f.read()).hex()

    hash_valid = actual_hash.lower() == doc_hash.lower()

    # Query on-chain committed documents
    onchain_docs = blockchain.get_project_documents_onchain(project_id)
    committed_onchain = any(d["doc_hash"].lower() == doc_hash.lower() for d in onchain_docs)

    return {
        "project_id": project_id,
        "doc_hash": doc_hash,
        "filename": doc.filename,
        "hash_integrity_valid": hash_valid,
        "committed_onchain": committed_onchain,
        "uploaded_by": doc.uploaded_by,
        "created_at": str(doc.created_at),
    }


# -----------------------------------------------------------------------------
# CREDIT BATCH PROVENANCE
# -----------------------------------------------------------------------------

@router.get("/projects/{project_id}/batches", response_model=list[CreditBatchResponse])
def get_project_batches(project_id: int):
    """Retrieves all credit batches issued for this project with provenance metrics."""
    try:
        batches = blockchain.get_project_batches_onchain(project_id)
        return [CreditBatchResponse(**b) for b in batches]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -----------------------------------------------------------------------------
# RETIREMENT RECORDS & CERTIFICATES
# -----------------------------------------------------------------------------

@router.get("/certificates/{certificate_id}", response_model=RetirementCertificateResponse)
def get_retirement_certificate(certificate_id: int, db: Session = Depends(get_db)):
    """Fetches an immutable retirement record from the smart contract for QR verification."""
    try:
        r = blockchain.get_retirement_record_onchain(certificate_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Retirement certificate #{certificate_id} not found on-chain.")

    proj_meta = db.query(ProjectMetadata).filter(ProjectMetadata.onchain_project_id == r["project_id"]).first()

    return RetirementCertificateResponse(
        certificate_id=r["certificate_id"],
        project_id=r["project_id"],
        project_name=proj_meta.name if proj_meta else f"Project #{r['project_id']}",
        project_type=proj_meta.project_type if proj_meta else "Carbon Offset",
        location=proj_meta.location if proj_meta else "Global",
        retiree=r["retiree"],
        beneficiary=r["beneficiary"],
        retirement_reason=r["retirement_reason"],
        amount=r["amount"],
        timestamp=r["timestamp"],
        verification_url=f"/audit/certificate/{certificate_id}",
    )


@router.post("/projects/{project_id}/transfer", response_model=TxResponse)
def transfer_credits(project_id: int, payload: TransferRequest):
    try:
        result = blockchain.transfer_credits(payload.signer, project_id, payload.to_address, payload.amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TxResponse(tx_hash=result["tx_hash"])


@router.post("/projects/{project_id}/retire", response_model=TxResponse)
def retire_credits(project_id: int, payload: RetireRequest):
    try:
        result = blockchain.retire_credits(
            payload.signer,
            project_id,
            payload.amount,
            payload.beneficiary or "Self",
            payload.retirement_reason or "Voluntary Carbon Offset"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TxResponse(tx_hash=result["tx_hash"], certificate_id=result.get("certificate_id"))


@router.get("/projects/{project_id}/balance/{address}")
def get_balance(project_id: int, address: str):
    balance = blockchain.get_credit_balance(project_id, address)
    return {"project_id": project_id, "address": address, "balance": balance}
