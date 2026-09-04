"""
Blockchain interaction layer.

Wraps all the web3.py calls needed to talk to the deployed
CarbonCreditPlatform smart contract, so the rest of the backend (routers)
never has to deal with web3.py details directly.

DEMO ACCOUNTS
-------------
Hardhat's local node always creates the same 20 test accounts with the
same private keys (derived from a fixed test mnemonic) every time you run
`npx hardhat node`, unless you deliberately configure it otherwise. These
keys are PUBLIC and well known — every Hardhat user in the world sees the
identical list. That's exactly why they're safe to hardcode here: they
only ever hold fake ETH on your local machine and must NEVER be reused on
a real network.

We use a handful of them to represent demo "companies" and a "buyer" so
you can exercise the full submit -> approve -> trade -> retire flow via
API calls before the React frontend (with real MetaMask signing) exists.
"""

import json
import os

from web3 import Web3

from app.config import settings

# Standard Hardhat local test accounts (indices 0-4), derived programmatically
# from Hardhat's well-known default test mnemonic below — NOT hand-typed —
# so there is no risk of a transcription error in these long hex strings.
_HARDHAT_TEST_MNEMONIC = "test test test test test test test test test test test junk"


def _derive_demo_accounts() -> dict:
    from eth_account import Account

    Account.enable_unaudited_hdwallet_features()
    aliases = ["admin", "companyA", "companyB", "buyer", "companyC"]
    accounts = {}
    for i, alias in enumerate(aliases):
        acct = Account.from_mnemonic(_HARDHAT_TEST_MNEMONIC, account_path=f"m/44'/60'/0'/0/{i}")
        key_hex = acct.key.hex()
        if not key_hex.startswith("0x"):
            key_hex = "0x" + key_hex
        accounts[alias] = {"address": acct.address, "private_key": key_hex}
    return accounts


DEMO_ACCOUNTS = _derive_demo_accounts()

_ABI_PATH = os.path.join(os.path.dirname(__file__), "contract_abi.json")


def get_w3() -> Web3:
    return Web3(Web3.HTTPProvider(settings.rpc_url))


def get_contract(w3: Web3 | None = None):
    if w3 is None:
        w3 = get_w3()
    with open(_ABI_PATH) as f:
        abi = json.load(f)
    return w3.eth.contract(address=Web3.to_checksum_address(settings.contract_address), abi=abi)


def _send_transaction(w3: Web3, contract_function, private_key: str):
    """Build, sign, send, and wait for a contract-writing transaction."""
    account = w3.eth.account.from_key(private_key)
    tx = contract_function.build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
        }
    )
    signed = w3.eth.account.sign_transaction(tx, private_key=private_key)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return receipt


def resolve_signer(alias: str) -> str:
    """Turn a demo account alias like 'companyA' into its private key."""
    if alias not in DEMO_ACCOUNTS:
        raise ValueError(f"Unknown demo signer '{alias}'. Valid options: {list(DEMO_ACCOUNTS.keys())}")
    return DEMO_ACCOUNTS[alias]["private_key"]


def _fingerprint_to_bytes(fingerprint_hex: str) -> bytes:
    """Safely convert a fingerprint hex string to raw bytes32, regardless
    of whether it's prefixed with '0x' — avoids silently corrupting the
    hash if a '0x' prefix is missing or unexpectedly present."""
    h = fingerprint_hex[2:] if fingerprint_hex.startswith("0x") else fingerprint_hex
    raw = bytes.fromhex(h)
    if len(raw) != 32:
        raise ValueError(f"Fingerprint must be 32 bytes, got {len(raw)} bytes from '{fingerprint_hex}'")
    return raw


def is_duplicate(fingerprint_hex: str) -> bool:
    w3 = get_w3()
    contract = get_contract(w3)
    return contract.functions.isDuplicate(_fingerprint_to_bytes(fingerprint_hex)).call()


def submit_project(signer_alias: str, name: str, location: str, project_type: str, co2_tonnes: int, fingerprint_hex: str):
    w3 = get_w3()
    contract = get_contract(w3)
    private_key = resolve_signer(signer_alias)

    fn = contract.functions.submitProject(
        name, location, project_type, co2_tonnes, _fingerprint_to_bytes(fingerprint_hex)
    )
    receipt = _send_transaction(w3, fn, private_key)

    # Pull the new project ID out of the ProjectSubmitted event log.
    logs = contract.events.ProjectSubmitted().process_receipt(receipt)
    project_id = logs[0]["args"]["projectId"] if logs else None

    return {"tx_hash": receipt.transactionHash.hex(), "project_id": project_id}


def approve_project(project_id: int):
    w3 = get_w3()
    contract = get_contract(w3)
    fn = contract.functions.approveProject(project_id)
    receipt = _send_transaction(w3, fn, settings.verifier_private_key)
    return {"tx_hash": receipt.transactionHash.hex()}


def reject_project(project_id: int):
    w3 = get_w3()
    contract = get_contract(w3)
    fn = contract.functions.rejectProject(project_id)
    receipt = _send_transaction(w3, fn, settings.verifier_private_key)
    return {"tx_hash": receipt.transactionHash.hex()}


def transfer_credits(signer_alias: str, project_id: int, to_address: str, amount: int):
    w3 = get_w3()
    contract = get_contract(w3)
    private_key = resolve_signer(signer_alias)
    fn = contract.functions.transferCredits(project_id, Web3.to_checksum_address(to_address), amount)
    receipt = _send_transaction(w3, fn, private_key)
    return {"tx_hash": receipt.transactionHash.hex()}


def retire_credits(signer_alias: str, project_id: int, amount: int):
    w3 = get_w3()
    contract = get_contract(w3)
    private_key = resolve_signer(signer_alias)
    fn = contract.functions.retireCredits(project_id, amount)
    receipt = _send_transaction(w3, fn, private_key)
    return {"tx_hash": receipt.transactionHash.hex()}


def get_project_onchain(project_id: int):
    w3 = get_w3()
    contract = get_contract(w3)
    p = contract.functions.getProject(project_id).call()
    status_names = ["Pending", "Approved", "Rejected"]
    return {
        "id": p[0],
        "submitter": p[1],
        "name": p[2],
        "location": p[3],
        "project_type": p[4],
        "co2_tonnes": p[5],
        "fingerprint": "0x" + p[6].hex(),
        "status": status_names[p[7]],
        "submitted_at": p[8],
    }


def get_credit_balance(project_id: int, address: str) -> int:
    w3 = get_w3()
    contract = get_contract(w3)
    return contract.functions.getCreditBalance(project_id, Web3.to_checksum_address(address)).call()
