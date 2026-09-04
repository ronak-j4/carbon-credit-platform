"""
Off-chain data model.

The blockchain stores the minimal facts needed for trust and duplicate
detection (name, location, type, CO2 amount, fingerprint, status, credit
balances). Everything else that's useful for a real registry but doesn't
need to be tamper-proof or public — free-text descriptions, uploaded
document links, internal notes — lives here in a normal database instead.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func

from app.database import Base


class ProjectMetadata(Base):
    __tablename__ = "project_metadata"

    id = Column(Integer, primary_key=True, index=True)

    # Set once the project has been submitted on-chain and we know its ID.
    # Nullable because we sometimes want to run a duplicate pre-check
    # before actually submitting anything on-chain.
    onchain_project_id = Column(Integer, unique=True, nullable=True, index=True)

    # NOT unique here on purpose: the smart contract is the real source of
    # truth for duplicate prevention. It deliberately frees a fingerprint
    # when a project is rejected so it can be legitimately resubmitted —
    # this off-chain metadata table just mirrors history and shouldn't
    # impose a stricter rule than the contract does.
    fingerprint = Column(String, index=True, nullable=False)

    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    project_type = Column(String, nullable=False)
    co2_tonnes = Column(Integer, nullable=False)
    description = Column(String, nullable=True)
    submitter_address = Column(String, nullable=False, index=True)

    submitted_onchain = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
