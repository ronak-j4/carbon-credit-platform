"""
Blockchain interaction layer.

Wraps all the web3.py calls needed to talk to the deployed
CarbonCreditPlatform smart contract, so the rest of the backend (routers)
never has to deal with web3.py details directly.
"""

import json
import os

from web3 import Web3

from app.config import settings

_HARDHAT_TEST_MNEMONIC = "test test test test test test test test test test test junk"


def _derive_demo_accounts() -> dict:
    from eth_account import Account

    Account.enable_unaudited_hdwallet_features()
    aliases = ["admin", "companyA", "companyB", "buyer", "companyC", "verifier2"]
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

    logs = contract.events.ProjectSubmitted().process_receipt(receipt)
    project_id = logs[0]["args"]["projectId"] if logs else None

    return {"tx_hash": receipt.transactionHash.hex(), "project_id": project_id}


def approve_project(project_id: int, signer_key: str | None = None):
    w3 = get_w3()
    contract = get_contract(w3)
    key = signer_key or settings.verifier_private_key
    fn = contract.functions.approveProject(project_id)
    receipt = _send_transaction(w3, fn, key)
    return {"tx_hash": receipt.transactionHash.hex()}


def reject_project(project_id: int):
    w3 = get_w3()
    contract = get_contract(w3)
    fn = contract.functions.rejectProject(project_id)
    receipt = _send_transaction(w3, fn, settings.verifier_private_key)
    return {"tx_hash": receipt.transactionHash.hex()}


def attach_document(project_id: int, doc_hash_hex: str, doc_type: str, uri: str, signer_key: str | None = None):
    w3 = get_w3()
    contract = get_contract(w3)
    key = signer_key or settings.verifier_private_key
    h_bytes = _fingerprint_to_bytes(doc_hash_hex)
    fn = contract.functions.attachVerificationDocument(project_id, h_bytes, doc_type, uri)
    receipt = _send_transaction(w3, fn, key)
    return {"tx_hash": receipt.transactionHash.hex()}


def transfer_credits(signer_alias: str, project_id: int, to_address: str, amount: int):
    w3 = get_w3()
    contract = get_contract(w3)
    private_key = resolve_signer(signer_alias)
    fn = contract.functions.transferCredits(project_id, Web3.to_checksum_address(to_address), amount)
    receipt = _send_transaction(w3, fn, private_key)
    return {"tx_hash": receipt.transactionHash.hex()}


def retire_credits(signer_alias: str, project_id: int, amount: int, beneficiary: str = "Self", reason: str = "Voluntary Carbon Offset"):
    w3 = get_w3()
    contract = get_contract(w3)
    private_key = resolve_signer(signer_alias)
    fn = contract.functions.retireCreditsWithDetails(project_id, amount, beneficiary, reason)
    receipt = _send_transaction(w3, fn, private_key)

    cert_logs = contract.events.CertificateIssued().process_receipt(receipt)
    certificate_id = cert_logs[0]["args"]["certificateId"] if cert_logs else None

    return {"tx_hash": receipt.transactionHash.hex(), "certificate_id": certificate_id}


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
        "approvals_count": p[9] if len(p) > 9 else 0,
    }


def get_project_verifiers(project_id: int) -> list[str]:
    w3 = get_w3()
    contract = get_contract(w3)
    try:
        return contract.functions.getProjectVerifiers(project_id).call()
    except Exception:
        return []


def get_project_documents_onchain(project_id: int) -> list[dict]:
    w3 = get_w3()
    contract = get_contract(w3)
    try:
        raw_docs = contract.functions.getProjectDocuments(project_id).call()
        results = []
        for d in raw_docs:
            results.append({
                "doc_hash": "0x" + d[0].hex(),
                "doc_type": d[1],
                "uri": d[2],
                "uploaded_by": d[3],
                "uploaded_at": d[4],
            })
        return results
    except Exception:
        return []


def get_project_batches_onchain(project_id: int) -> list[dict]:
    w3 = get_w3()
    contract = get_contract(w3)
    try:
        batch_ids = contract.functions.getProjectBatches(project_id).call()
        results = []
        for bid in batch_ids:
            b = contract.functions.getCreditBatch(bid).call()
            results.append({
                "batch_id": b[0],
                "project_id": b[1],
                "total_supply": b[2],
                "active_supply": b[3],
                "retired_supply": b[4],
                "minted_at": b[5],
                "vintage": b[6],
            })
        return results
    except Exception:
        return []


def get_retirement_record_onchain(certificate_id: int) -> dict:
    w3 = get_w3()
    contract = get_contract(w3)
    r = contract.functions.getRetirementRecord(certificate_id).call()
    # If certificateId field is 0, the record doesn't exist (zero-value Solidity struct)
    if r[0] == 0:
        raise ValueError(f"Retirement record #{certificate_id} not found on-chain.")
    return {
        "certificate_id": r[0],
        "project_id": r[1],
        "retiree": r[2],
        "beneficiary": r[3],
        "retirement_reason": r[4],
        "amount": r[5],
        "timestamp": r[6],
    }


def get_project_retirements_onchain(project_id: int) -> list[dict]:
    w3 = get_w3()
    contract = get_contract(w3)
    try:
        cert_ids = contract.functions.getProjectRetirements(project_id).call()
        results = []
        for cid in cert_ids:
            results.append(get_retirement_record_onchain(cid))
        return results
    except Exception:
        return []


def get_credit_balance(project_id: int, address: str) -> int:
    w3 = get_w3()
    contract = get_contract(w3)
    return contract.functions.getCreditBalance(project_id, Web3.to_checksum_address(address)).call()
