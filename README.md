# 🌱 CarbonChain

### Blockchain-Based Carbon Credit Issuance, Verification & Marketplace Platform

<p align="center">
  <strong>Transparent • Traceable • Tamper-Resistant • Decentralized</strong>
</p>

<p align="center">
  A full-stack Web3 platform for registering carbon projects, verifying them on-chain,
  issuing carbon credits, transferring credits, trading them through a marketplace,
  and permanently retiring credits with a verifiable certificate.
</p>

---

## 🌍 Overview

CarbonChain is a blockchain-powered carbon credit management platform designed to improve **transparency, traceability, and trust** in the carbon credit lifecycle.

Traditional carbon credit systems can involve multiple intermediaries and off-chain records, making it difficult to independently verify:

- Where a carbon credit originated
- Whether a project has already been registered
- Who currently owns the credits
- Whether credits have been transferred
- Whether credits have already been retired
- Whether the same project has been submitted more than once

CarbonChain addresses these problems by combining:

- ⛓️ **Ethereum smart contracts**
- 🦊 **MetaMask wallet-based transactions**
- ⚡ **React + Vite frontend**
- 🐍 **FastAPI backend**
- 🗄️ **SQLite metadata storage**
- 🔐 **Role-based project verification**
- 🔎 **On-chain duplicate project detection**
- 💱 **On-chain carbon credit marketplace**
- 📜 **PDF retirement certificates**

The blockchain acts as the authoritative layer for project state, credit ownership, transfers, marketplace listings, and retirement.

---

# ✨ Key Features

## 🌱 1. Carbon Project Registration

Users can submit carbon reduction/removal projects with information such as:

- Project name
- Location
- Project type
- Estimated CO₂ reduction/removal
- Project start date
- Project end date
- Project description

Supported project categories include:

- ☀️ Solar
- 🌬️ Wind
- 🌳 Tree Plantation
- ♻️ Biogas

Every project receives a unique on-chain project ID.

---

## 🔍 2. Duplicate Project Detection

CarbonChain generates a cryptographic fingerprint from:

Project Name
+
Location
+
Project Type
+
Start Date
+
End Date

The normalized values are hashed using:

Keccak-256

Conceptually:

name | location | projectType | startDate | endDate

                         ↓
                    Keccak-256
                         ↓
                  bytes32 fingerprint

The fingerprint is stored on-chain.

This prevents the same project, with the same identity and reporting period, from being submitted multiple times.

Example
Solar Farm X
Rajasthan
Solar
2022-08 → 2025-02

and

Solar Farm X
Rajasthan
Solar
2025-03 → 2028-01

produce different fingerprints because their project periods are different.

⛓️ 3. Blockchain Project Lifecycle

Every project follows an on-chain lifecycle:

                ┌───────────────────┐
                │   Submit Project  │
                └─────────┬─────────┘
                          │
                          ▼
                ┌───────────────────┐
                │      Pending      │
                └─────────┬─────────┘
                          │
                 ┌────────┴────────┐
                 │                 │
                 ▼                 ▼
          ┌─────────────┐   ┌─────────────┐
          │   Approved  │   │   Rejected  │
          └──────┬──────┘   └─────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Carbon Credits     │
        │ Issued to Owner    │
        └─────────┬──────────┘
                  │
          ┌───────┼────────┐
          │       │        │
          ▼       ▼        ▼
       Transfer  Trade   Retire
                  │        │
                  │        ▼
                  │   ┌──────────────┐
                  │   │ Permanently  │
                  │   │   Retired    │
                  │   └──────┬───────┘
                  │          │
                  │          ▼
                  │   📜 Retirement
                  │      Certificate
                  │
                  ▼
              Marketplace
🛡️ 4. Role-Based Verification

CarbonChain uses OpenZeppelin's AccessControl.

The smart contract defines:

VERIFIER_ROLE

Only accounts with this role can:

Approve projects
Reject projects

The contract deployer automatically receives:

DEFAULT_ADMIN_ROLE
VERIFIER_ROLE

Additional verifier accounts can be granted the verifier role.

This provides a clear separation between:

Project Submitter
        ↓
    Verification
        ↓
Verifier / Admin
        ↓
   Credit Issuance
🪙 5. Carbon Credit Issuance

When a verifier approves a project:

Project CO₂ Tonnes
        ↓
Approved
        ↓
Credits issued
        ↓
Submitter receives credits

For example:

Project CO₂ Amount = 1000 tonnes

After approval:

Owner Balance = 1000 carbon credits

The credit balance is maintained on-chain.

🔄 6. Credit Transfer

Credit holders can transfer credits directly to another wallet.

Example:

Company A
1000 credits
     │
     │ Transfer 300
     ▼
Company B
300 credits

After the transaction:

Company A → 700 credits
Company B → 300 credits

The blockchain records the transfer through:

CreditsTransferred

event.
