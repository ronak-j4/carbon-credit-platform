"""
Duplicate detection service.

This is the Python equivalent of the `makeFingerprint()` helper used in
the Solidity test suite (test/CarbonCreditPlatform.test.js). It MUST stay
in sync with that logic: both take (name, location, projectType), lowercase
and trim them, join with "|", and hash with keccak256. If this ever
diverges from the JS version, two textually-identical projects could
produce different fingerprints and slip past duplicate detection.
"""

from web3 import Web3


def normalize_project_fields(name: str, location: str, project_type: str) -> str:
    """Reduce project identifying fields to a single normalized string so
    that trivial differences (capitalization, stray whitespace) don't
    cause the same real-world project to hash differently."""
    return f"{name.strip().lower()}|{location.strip().lower()}|{project_type.strip().lower()}"


def compute_fingerprint(name: str, location: str, project_type: str) -> str:
    """Compute the keccak256 fingerprint hash for a project.

    Returns a 0x-prefixed 32-byte hex string, matching the `bytes32`
    fingerprint type expected by the smart contract's submitProject().

    Note: Web3.keccak(...).hex() does NOT reliably include the '0x'
    prefix across web3.py versions, so we normalize it explicitly here
    rather than assuming a fixed format.
    """
    normalized = normalize_project_fields(name, location, project_type)
    raw_hex = Web3.keccak(text=normalized).hex()
    if not raw_hex.startswith("0x"):
        raw_hex = "0x" + raw_hex
    return raw_hex
