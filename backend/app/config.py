"""
Configuration for the FastAPI backend.

All values here can be overridden by a `.env` file in the backend folder
(see .env.example) so you never have to hardcode secrets in source code.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # URL of the blockchain node the backend talks to.
    # For local development this is your `npx hardhat node` instance.
    rpc_url: str = "http://127.0.0.1:8545"

    # Address of the deployed CarbonCreditPlatform contract.
    # You get this from the output of `npx hardhat run scripts/deploy.js`.
    contract_address: str = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

    # Private key of the account that has VERIFIER_ROLE on the contract.
    # By default this is Hardhat's account #0 (the deployer, which the
    # deploy script grants VERIFIER_ROLE to automatically). This is a
    # PUBLICLY KNOWN test-only key that Hardhat prints on every fresh
    # local node — it is safe here ONLY because it never touches real
    # money on a real network.
    verifier_private_key: str = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

    # Local SQLite database file for off-chain project metadata
    # (descriptions, documents, timestamps) that doesn't need to live on
    # the blockchain itself.
    database_url: str = "sqlite:///./carbon_credits.db"

    class Config:
        env_file = ".env"


settings = Settings()
