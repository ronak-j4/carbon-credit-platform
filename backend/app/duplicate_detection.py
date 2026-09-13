from web3 import Web3

def normalize_project_fields(name: str, location: str, project_type: str, start_date: str, end_date: str) -> str:
    """Reduce project identifying fields to a single normalized string.
    Including the project period means two projects with identical name,
    location, and type but DIFFERENT date ranges are treated as distinct
    projects — e.g. a solar farm's 2022-2025 monitoring period is a
    separate registration from the same farm's 2025-2028 period."""
    return (
        f"{name.strip().lower()}|{location.strip().lower()}|{project_type.strip().lower()}"
        f"|{start_date.strip()}|{end_date.strip()}"
    )

def compute_fingerprint(name: str, location: str, project_type: str, start_date: str, end_date: str) -> str:
    """Compute the keccak256 fingerprint hash for a project.

    Returns a 0x-prefixed 32-byte hex string, matching the `bytes32`
    fingerprint type expected by the smart contract's submitProject().

    Note: Web3.keccak(...).hex() does NOT reliably include the '0x'
    prefix across web3.py versions, so we normalize it explicitly here
    rather than assuming a fixed format.
    """
    normalized = normalize_project_fields(name, location, project_type, start_date, end_date)
    raw_hex = Web3.keccak(text=normalized).hex()
    if not raw_hex.startswith("0x"):
        raw_hex = "0x" + raw_hex
    return raw_hex
