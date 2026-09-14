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
CreditsTransferred event.

💱 7. Carbon Credit Marketplace

CarbonChain includes an on-chain fixed-price marketplace.

Credit owners can:

List credits
Project
   ↓
Owner chooses amount
   ↓
Owner chooses price / credit
   ↓
Create Listing

The listed credits are immediately escrowed by the smart contract.

This prevents the seller from simultaneously:

Transferring the credits
Retiring the credits
Creating another listing for the same credits
🛒 Buying Credits

A buyer can purchase credits directly from an active listing.

The buyer sends:

Amount × Price Per Credit

in ETH.

Example:

Listing:
300 credits

Price:
0.01 ETH / credit

Total:
3 ETH

The buyer receives the credits and the seller receives the payment.

📦 Partial Marketplace Purchases

Listings support partial fills.

Example:

Original Listing:
300 credits

Buyer purchases:
100 credits

Remaining Listing:
200 credits

The listing remains active until all credits are sold or the seller cancels it.

♻️ 8. Carbon Credit Retirement

Credits can be permanently retired.

Example:

Owner Balance
1000 credits

       │
       │ Retire 200
       ▼

Owner Balance
800 credits

Total Retired
200 credits

Retired credits cannot be reused by the owner.

The smart contract records:

totalRetired[projectId]

and emits:

CreditsRetired

This creates an auditable on-chain retirement record.

📜 9. Retirement Certificate

After a successful retirement transaction, CarbonChain generates a downloadable PDF certificate.

The certificate includes information such as:

Project name
Project location
Project type
On-chain project ID
Retiring wallet
Number of retired credits
Blockchain transaction hash
Retirement date
Permanent retirement statement

The transaction hash provides a direct cryptographic reference to the blockchain event.

🔐 10. Wallet-Based Web3 Interaction

CarbonChain uses MetaMask for blockchain interaction.

Users connect their wallet and directly sign blockchain transactions.

Examples include:

Submit Project
      ↓
MetaMask
      ↓
User signs transaction
      ↓
Ethereum / Hardhat

The same model is used for:

Project submission
Project approval/rejection
Credit transfer
Credit retirement
Marketplace listing
Marketplace purchases

The frontend does not need to hold users' private keys.

🧠 Architecture

CarbonChain uses a hybrid architecture.

                         ┌──────────────────────┐
                         │      User / Wallet   │
                         │       MetaMask       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    React Frontend    │
                         │       + Vite         │
                         └──────────┬───────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  │                                   │
                  ▼                                   ▼
       ┌─────────────────────┐            ┌──────────────────────┐
       │     FastAPI API     │            │ Ethereum Smart       │
       │      Backend        │            │ Contract             │
       └──────────┬──────────┘            └──────────┬───────────┘
                  │                                   │
                  ▼                                   │
       ┌─────────────────────┐                        │
       │       SQLite        │                        │
       │  Off-chain Metadata │                        │
       └─────────────────────┘                        │
                                                      ▼
                                           ┌──────────────────────┐
                                           │   Hardhat Local      │
                                           │      Blockchain      │
                                           └──────────────────────┘
🏗️ Technology Stack
Layer	Technology
Frontend	React
Build Tool	Vite
Web3	ethers.js v6
Wallet	MetaMask
Backend	Python FastAPI
Database	SQLite
ORM	SQLAlchemy
Blockchain	Ethereum-compatible
Local Blockchain	Hardhat
Smart Contract	Solidity 0.8.24
Access Control	OpenZeppelin
Charts	Recharts
Icons	Lucide React
Certificates	jsPDF
Testing	Hardhat + Chai
API Validation	Pydantic
📁 Project Structure
carbon-credit-platform/
│
├── backend/
│   │
│   ├── app/
│   │   ├── main.py
│   │   ├── blockchain.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   │
│   │   └── routers/
│   │       └── projects.py
│   │
│   ├── .env.example
│   └── requirements.txt
│
├── contracts/
│   └── CarbonCreditPlatform.sol
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── ProjectCard.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── ProjectsList.jsx
│   │   │   ├── SubmitProject.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Marketplace.jsx
│   │   │
│   │   ├── hooks/
│   │   │   └── useWallet.js
│   │   │
│   │   ├── api/
│   │   │   └── client.js
│   │   │
│   │   ├── contract/
│   │   │   ├── config.js
│   │   │   └── abi.json
│   │   │
│   │   ├── utils/
│   │   │   ├── fingerprint.js
│   │   │   └── certificate.js
│   │   │
│   │   ├── App.jsx
│   │   └── index.css
│   │
│   ├── package.json
│   └── vite.config.js
│
├── scripts/
│   └── deploy.js
│
├── test/
│   └── CarbonCreditPlatform.test.js
│
├── hardhat.config.js
├── package.json
├── package-lock.json
└── README.md
🔗 Smart Contract

The main contract is:

CarbonCreditPlatform.sol

It uses:

pragma solidity ^0.8.24;

and OpenZeppelin:

AccessControl
📋 Smart Contract Data Model
Project
struct Project {
    uint256 id;
    address submitter;
    string name;
    string location;
    string projectType;
    uint256 co2Tonnes;
    bytes32 fingerprint;
    ProjectStatus status;
    uint256 submittedAt;
}
Listing
struct Listing {
    uint256 id;
    uint256 projectId;
    address seller;
    uint256 amount;
    uint256 pricePerCredit;
    bool active;
}
⚙️ Smart Contract Functions
Project Management
submitProject(...)
approveProject(...)
rejectProject(...)
getProject(...)
isDuplicate(...)
Credit Management
transferCredits(...)
retireCredits(...)
getCreditBalance(...)
Marketplace
createListing(...)
cancelListing(...)
buyListing(...)
getListing(...)
📡 Smart Contract Events

CarbonChain emits events for important blockchain actions.

ProjectSubmitted
ProjectApproved
ProjectRejected
CreditsTransferred
CreditsRetired
ListingCreated
ListingCancelled
ListingSold

These events make the system easier to audit and integrate with blockchain explorers or future indexing systems.

🧪 Testing

The smart contract includes automated tests covering:

Roles
Admin role
Verifier role
Project Submission
Successful submission
Zero CO₂ rejection
Duplicate detection
Period-aware fingerprints
Unique project detection
Verification
Project approval
Project rejection
Unauthorized verifier prevention
Double approval prevention
Credit Management
Credit transfer
Insufficient balance prevention
Credit retirement
Retirement balance updates
Marketplace
Listing creation
Credit escrow
Listing cancellation
Seller authorization
Full purchase
Partial purchase
Incorrect ETH payment
Invalid purchase amount
Cancelled listing protection
