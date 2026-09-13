from sqlalchemy import Column, Integer, String, DateTime, Boolean
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
    submitter_address = Column(String, nullable=False, index=True)
    submitted_onchain = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
