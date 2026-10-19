from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float
from sqlalchemy.sql import func
from app.database import Base

class ProjectMetadata(Base):
    __tablename__ = "project_metadata"
    id = Column(Integer, primary_key=True, index=True)
    onchain_project_id = Column(Integer, unique=True, nullable=True, index=True)
    fingerprint = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    project_type = Column(String, nullable=False)
    co2_tonnes = Column(Integer, nullable=False)
    start_date = Column(String, nullable=True)  # stored as "YYYY-MM", e.g. "2022-08"
    end_date = Column(String, nullable=True)
    description = Column(String, nullable=True)
    boundary_geojson = Column(Text, nullable=True)  # GeoJSON Polygon string
    center_lat = Column(Float, nullable=True)
    center_lng = Column(Float, nullable=True)
    submitter_address = Column(String, nullable=False, index=True)
    submitted_onchain = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class VerificationDocumentRecord(Base):
    __tablename__ = "verification_documents"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False, index=True)
    doc_hash = Column(String, unique=True, index=True, nullable=False)
    doc_type = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String, nullable=True)
    uploaded_by = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
