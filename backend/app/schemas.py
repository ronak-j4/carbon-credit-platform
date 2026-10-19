from pydantic import BaseModel
from typing import Optional, List, Any


class GeoJSONPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: List[List[List[float]]]  # [[[lng, lat], [lng, lat], ...]]


class MapCenter(BaseModel):
    latitude: float
    longitude: float


class OverlapMatch(BaseModel):
    project_id: int
    project_name: str
    status: str
    overlap_area_km2: float
    overlap_percentage: float
    existing_boundary: Optional[dict] = None
    intersection_geojson: Optional[dict] = None


class DuplicateCheckRequest(BaseModel):
    name: str
    location: str
    project_type: str
    start_date: str  # "YYYY-MM"
    end_date: str    # "YYYY-MM"
    polygon: Optional[GeoJSONPolygon] = None


class DuplicateCheckResponse(BaseModel):
    fingerprint: str
    is_duplicate: bool
    overlap_detected: bool = False
    overlaps: List[OverlapMatch] = []


class SubmitProjectRequest(BaseModel):
    signer: str  # demo account alias, e.g. "companyA"
    name: str
    location: str
    project_type: str
    co2_tonnes: int
    start_date: str
    end_date: str
    description: Optional[str] = None
    polygon: Optional[GeoJSONPolygon] = None
    center: Optional[MapCenter] = None


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
    polygon: Optional[GeoJSONPolygon] = None
    center: Optional[MapCenter] = None


class VerificationDocumentResponse(BaseModel):
    id: Optional[int] = None
    project_id: int
    doc_hash: str
    doc_type: str
    filename: str
    file_size: int
    content_type: Optional[str] = None
    uploaded_by: str
    download_url: str
    created_at: Optional[str] = None
    onchain_committed: bool = False


class CreditBatchResponse(BaseModel):
    batch_id: int
    project_id: int
    total_supply: int
    active_supply: int
    retired_supply: int
    minted_at: int
    vintage: str


class RetirementCertificateResponse(BaseModel):
    certificate_id: int
    project_id: int
    project_name: Optional[str] = None
    project_type: Optional[str] = None
    location: Optional[str] = None
    retiree: str
    beneficiary: str
    retirement_reason: str
    amount: int
    timestamp: int
    tx_hash: Optional[str] = None
    verification_url: Optional[str] = None


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
    polygon: Optional[dict] = None
    center: Optional[dict] = None
    approvals_count: int = 0
    verifiers: List[str] = []
    documents: List[VerificationDocumentResponse] = []
    batches: List[CreditBatchResponse] = []


class TransferRequest(BaseModel):
    signer: str
    to_address: str
    amount: int


class RetireRequest(BaseModel):
    signer: str
    amount: int
    beneficiary: Optional[str] = "Self"
    retirement_reason: Optional[str] = "Voluntary Carbon Offset"


class TxResponse(BaseModel):
    tx_hash: str
    project_id: Optional[int] = None
    certificate_id: Optional[int] = None
