from pydantic import BaseModel
from typing import Optional


class DuplicateCheckRequest(BaseModel):
    name: str
    location: str
    project_type: str
    start_date: str  # "YYYY-MM"
    end_date: str    # "YYYY-MM"


class DuplicateCheckResponse(BaseModel):
    fingerprint: str
    is_duplicate: bool


class SubmitProjectRequest(BaseModel):
    signer: str  # demo account alias, e.g. "companyA"
    name: str
    location: str
    project_type: str
    co2_tonnes: int
    start_date: str
    end_date: str
    description: Optional[str] = None


class RecordMetadataRequest(BaseModel):
    """Used when the frontend submits a project directly on-chain via
    MetaMask, then tells the backend to store the off-chain metadata for
    the project it just created."""
    onchain_project_id: int
    fingerprint: str
    name: str
    location: str
    project_type: str
    co2_tonnes: int
    start_date: str
    end_date: str
    submitter_address: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: Optional[int]
    submitter: str
    name: str
    location: str
    project_type: str
    co2_tonnes: int
    fingerprint: str
    status: str
    submitted_at: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None


class TransferRequest(BaseModel):
    signer: str
    to_address: str
    amount: int


class RetireRequest(BaseModel):
    signer: str
    amount: int


class TxResponse(BaseModel):
    tx_hash: str
    project_id: Optional[int] = None
