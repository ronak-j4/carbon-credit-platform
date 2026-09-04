from pydantic import BaseModel
from typing import Optional


class DuplicateCheckRequest(BaseModel):
    name: str
    location: str
    project_type: str


class DuplicateCheckResponse(BaseModel):
    fingerprint: str
    is_duplicate: bool


class SubmitProjectRequest(BaseModel):
    signer: str  # demo account alias, e.g. "companyA"
    name: str
    location: str
    project_type: str
    co2_tonnes: int
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
