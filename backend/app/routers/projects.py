from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import blockchain, duplicate_detection
from app.database import get_db
from app.models import ProjectMetadata
from app.schemas import (
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    SubmitProjectRequest,
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
    without submitting anything on-chain yet."""
    fingerprint = duplicate_detection.compute_fingerprint(payload.name, payload.location, payload.project_type)
    is_dup = blockchain.is_duplicate(fingerprint)
    return DuplicateCheckResponse(fingerprint=fingerprint, is_duplicate=is_dup)


@router.post("/projects/submit", response_model=TxResponse)
def submit_project(payload: SubmitProjectRequest, db: Session = Depends(get_db)):
    """Submit a new project. Computes the fingerprint, checks for
    duplicates, submits on-chain, and stores off-chain metadata."""
    fingerprint = duplicate_detection.compute_fingerprint(payload.name, payload.location, payload.project_type)

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
        description=payload.description,
        submitter_address=signer_address,
        submitted_onchain=True,
    )
    db.add(record)
    db.commit()

    return TxResponse(tx_hash=result["tx_hash"], project_id=result["project_id"])


@router.get("/projects", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    """Lists all submitted projects, merging on-chain status with
    off-chain metadata (like description)."""
    records = db.query(ProjectMetadata).filter(ProjectMetadata.submitted_onchain == True).all()  # noqa: E712
    results = []
    for r in records:
        onchain = blockchain.get_project_onchain(r.onchain_project_id)
        results.append(ProjectResponse(**onchain, description=r.description))
    return results


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    try:
        onchain = blockchain.get_project_onchain(project_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Project not found on-chain")

    record = db.query(ProjectMetadata).filter(ProjectMetadata.onchain_project_id == project_id).first()
    description = record.description if record else None

    return ProjectResponse(**onchain, description=description)


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
