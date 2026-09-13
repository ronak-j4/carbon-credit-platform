from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import blockchain, duplicate_detection
from app.database import get_db
from app.models import ProjectMetadata
from app.schemas import (
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    SubmitProjectRequest,
    RecordMetadataRequest,
    ProjectResponse,
    TransferRequest,
    RetireRequest,
    TxResponse,
)

router = APIRouter()


@router.get("/accounts/demo")
def list_demo_accounts():
    """Lists the demo account aliases and addresses available for local
    testing (never their private keys). Use these as the `signer` field
    in submit/transfer/retire requests."""
    return {alias: info["address"] for alias, info in blockchain.DEMO_ACCOUNTS.items()}


@router.post("/projects/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate(payload: DuplicateCheckRequest):
    """Pre-check whether a project would be flagged as a duplicate,
    without submitting anything on-chain yet. The project period is part
    of the fingerprint, so the same site with a different reporting
    period is correctly treated as a distinct project."""
    fingerprint = duplicate_detection.compute_fingerprint(
        payload.name, payload.location, payload.project_type, payload.start_date, payload.end_date
    )
    is_dup = blockchain.is_duplicate(fingerprint)
    return DuplicateCheckResponse(fingerprint=fingerprint, is_duplicate=is_dup)


@router.post("/projects/submit", response_model=TxResponse)
def submit_project(payload: SubmitProjectRequest, db: Session = Depends(get_db)):
    """Submit a new project using a backend-held demo signer (used for
    backend-only testing). The real frontend uses MetaMask directly and
    calls /projects/record afterwards instead."""
    fingerprint = duplicate_detection.compute_fingerprint(
        payload.name, payload.location, payload.project_type, payload.start_date, payload.end_date
    )

    if blockchain.is_duplicate(fingerprint):
        raise HTTPException(status_code=409, detail="Duplicate project detected — this project already exists.")

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
        submitter_address=signer_address,
        submitted_onchain=True,
    )
    db.add(record)
    db.commit()

    return TxResponse(tx_hash=result["tx_hash"], project_id=result["project_id"])


@router.post("/projects/record", response_model=ProjectResponse)
def record_metadata(payload: RecordMetadataRequest, db: Session = Depends(get_db)):
    """Called by the frontend AFTER it has already submitted a project
    directly on-chain via MetaMask. Stores the off-chain metadata
    (description, etc.) linked to the on-chain project ID, and returns the
    merged project view.

    This does not touch the blockchain — the transaction already happened
    client-side. We just verify the project genuinely exists on-chain
    before trusting the metadata, so this endpoint can't be used to store
    fake records for projects that were never actually submitted."""
    try:
        onchain = blockchain.get_project_onchain(payload.onchain_project_id)
    except Exception:
        raise HTTPException(status_code=404, detail="No such project exists on-chain — submit it via MetaMask first.")

    existing = (
        db.query(ProjectMetadata).filter(ProjectMetadata.onchain_project_id == payload.onchain_project_id).first()
    )
    if existing:
        existing.description = payload.description
        existing.start_date = payload.start_date
        existing.end_date = payload.end_date
        db.commit()
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
            submitter_address=payload.submitter_address,
            submitted_onchain=True,
        )
        db.add(record)
        db.commit()

    return ProjectResponse(**onchain, description=payload.description, start_date=payload.start_date, end_date=payload.end_date)


@router.get("/projects", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    """Lists all submitted projects, merging on-chain status with
    off-chain metadata (like description)."""
    records = db.query(ProjectMetadata).filter(ProjectMetadata.submitted_onchain == True).all()  # noqa: E712
    results = []
    for r in records:
        onchain = blockchain.get_project_onchain(r.onchain_project_id)
        results.append(
            ProjectResponse(**onchain, description=r.description, start_date=r.start_date, end_date=r.end_date)
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

    return ProjectResponse(**onchain, description=description, start_date=start_date, end_date=end_date)


@router.post("/projects/{project_id}/approve", response_model=TxResponse)
def approve_project(project_id: int):
    """Approve a pending project. Uses the backend's configured verifier
    account — real verifier staff log into the platform, they don't need
    their own crypto wallet for this action."""
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
        result = blockchain.retire_credits(payload.signer, project_id, payload.amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TxResponse(tx_hash=result["tx_hash"])


@router.get("/projects/{project_id}/balance/{address}")
def get_balance(project_id: int, address: str):
    balance = blockchain.get_credit_balance(project_id, address)
    return {"project_id": project_id, "address": address, "balance": balance}
