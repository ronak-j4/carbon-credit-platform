# 🌱 CarbonChain

### Blockchain-Based Carbon Credit Registry, Verification & Marketplace

> **CarbonChain** is a full-stack decentralized carbon-credit management platform that brings **project registration, duplicate detection, verification, credit issuance, ownership, trading, retirement, and analytics** into a single transparent workflow powered by **Blockchain, Smart Contracts, FastAPI, React, and SQLite**.

---

<p align="center">

  <img src="https://img.shields.io/badge/Blockchain-Ethereum%20Compatible-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white" alt="Blockchain">

  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity">

  <img src="https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">

  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">

  <img src="https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">

  <img src="https://img.shields.io/badge/Smart%20Contracts-OpenZeppelin-4E5EE4?style=for-the-badge" alt="OpenZeppelin">

</p>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [Complete Carbon Credit Lifecycle](#-complete-carbon-credit-lifecycle)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Application Workflow](#-application-workflow)
- [Blockchain Architecture](#-blockchain-architecture)
- [Smart Contract Model](#-smart-contract-model)
- [Project Data Model](#-project-data-model)
- [Credit Accounting](#-credit-accounting)
- [Duplicate Detection](#-duplicate-detection)
- [Verification & Approval](#-verification--approval)
- [Marketplace](#-marketplace)
- [Credit Retirement](#-credit-retirement)
- [Analytics Dashboard](#-analytics-dashboard)
- [Frontend](#-frontend)
- [Backend](#-backend)
- [Database](#-database)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the Project](#-running-the-project)
- [MetaMask Configuration](#-metamask-configuration)
- [Smart Contract Deployment](#-smart-contract-deployment)
- [Testing](#-testing)
- [API](#-api)
- [Security & Access Control](#-security--access-control)
- [Design Decisions](#-design-decisions)
- [Current Scope](#-current-scope)
- [Future Enhancements](#-future-enhancements)
- [Use Cases](#-use-cases)
- [Learning Outcomes](#-learning-outcomes)
- [Team](#-team)
- [License](#-license)

---

# 🌍 Overview

Carbon credits are designed to represent measurable reductions or removals of greenhouse-gas emissions.

However, traditional carbon-credit workflows can suffer from problems such as:

- Duplicate project submissions
- Duplicate credit claims
- Lack of transparent ownership
- Difficult verification workflows
- Poor traceability
- Manual record keeping
- Limited visibility into credit circulation
- Unclear retirement history

**CarbonChain** addresses these problems by combining a conventional web application with blockchain-backed records.

The platform allows a project to move through the following lifecycle:

```text
Project Submission
       ↓
Project Fingerprint Generation
       ↓
Duplicate Detection
       ↓
Verification
       ↓
Approval / Rejection
       ↓
Carbon Credit Issuance
       ↓
Credit Ownership
       ↓
Marketplace Listing
       ↓
Credit Purchase
       ↓
Ownership Transfer
       ↓
Credit Retirement
       ↓
Permanent Retirement Record
       ↓
Analytics & Impact Tracking
```

---

# ❗ Problem Statement

Carbon-credit ecosystems require trust between:

- 🌱 Project developers
- 🏢 Organizations
- 💰 Buyers
- 🔍 Verifiers
- 🌍 Environmental stakeholders

A centralized database can store information, but users ultimately have to trust that the records have not been improperly modified.

CarbonChain uses blockchain as a **tamper-resistant verification and accounting layer**.

The system separates responsibilities:

| Layer | Responsibility |
|---|---|
| Frontend | User interface and interaction |
| Backend | Business logic, validation and database operations |
| Database | Off-chain application data |
| Blockchain | Trusted project and credit state |
| Smart Contract | Verification, issuance, transfer, marketplace and retirement rules |
| MetaMask | Wallet authentication and blockchain transactions |

---

# 💡 Our Solution

CarbonChain creates a transparent digital registry where verified carbon projects can be converted into trackable carbon credits.

The platform provides:

### 🌱 Project Registration
Users can submit carbon projects with important project information.

### 🔍 Duplicate Detection
A project fingerprint is generated and checked against existing records to reduce duplicate submissions.

### ✅ Verification
Projects remain pending until an authorized verifier/admin approves them.

### ⛓️ Blockchain Registry
Important project states and credit operations are recorded through a Solidity smart contract.

### 🪙 Credit Issuance
Approved projects receive credits based on their verified CO₂ reduction quantity.

### 👛 Ownership Tracking
Credit balances are associated with blockchain wallet addresses.

### 🏪 Marketplace
Users can list available credits at a fixed price and purchase credits from other users.

### 🔄 Transfer
Credits can move between eligible wallets.

### ♻️ Retirement
Credits can be permanently retired when they are used for offsetting purposes.

### 📊 Analytics
The platform provides an overview of registered projects, issued credits, traded credits and retired credits.

---

# ✨ Key Features

| Feature | Description |
|---|---|
| 🌱 Project Registration | Register new carbon projects |
| 🔐 Wallet Integration | Connect through MetaMask |
| 🔍 Duplicate Detection | Detect potentially duplicate projects |
| 🧾 Project Fingerprinting | Generate deterministic project fingerprints |
| 👨‍⚖️ Verification | Approve or reject submitted projects |
| ⛓️ Blockchain Registry | Maintain trusted project records |
| 🪙 Credit Issuance | Issue credits after approval |
| 👛 Balance Tracking | Track wallet credit balances |
| 🏪 Marketplace | List and purchase credits |
| 💰 Fixed Pricing | Simple fixed-price trading |
| 🔄 Ownership Transfer | Move credits between wallets |
| ♻️ Retirement | Permanently retire credits |
| 📊 Analytics | Monitor platform-wide statistics |
| 🛡️ Access Control | Restrict privileged blockchain operations |
| 💾 Database Persistence | Store application data through SQLite |
| ⚡ REST API | FastAPI-powered backend |
| 🖥️ Modern UI | React + Vite frontend |

---

# 🔄 Complete Carbon Credit Lifecycle

The entire platform revolves around a controlled lifecycle.

```text
                 ┌──────────────────────┐
                 │   Project Submission │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ Fingerprint Creation │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ Duplicate Detection │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ Verification Queue  │
                 └──────────┬───────────┘
                            ↓
                    ┌───────┴───────┐
                    ↓               ↓
                REJECTED         APPROVED
                                    │
                                    ↓
                         ┌──────────────────┐
                         │ Credit Issuance  │
                         └────────┬─────────┘
                                  ↓
                         ┌──────────────────┐
                         │ Credit Ownership │
                         └────────┬─────────┘
                                  ↓
                         ┌──────────────────┐
                         │   Marketplace    │
                         └────────┬─────────┘
                                  ↓
                         ┌──────────────────┐
                         │ Ownership Change │
                         └────────┬─────────┘
                                  ↓
                         ┌──────────────────┐
                         │ Credit Retirement│
                         └──────────────────┘
```

---

# 🏗️ System Architecture

CarbonChain follows a layered full-stack architecture.

```text
                    ┌─────────────────────────────┐
                    │           USER              │
                    │      Browser + MetaMask     │
                    └──────────────┬──────────────┘
                                   │
                                   ↓
                    ┌─────────────────────────────┐
                    │        React + Vite         │
                    │          Frontend           │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ↓                             ↓
          ┌──────────────────┐          ┌──────────────────┐
          │   FastAPI REST   │          │     ethers.js    │
          │       API        │          │    Web3 Layer    │
          └────────┬─────────┘          └────────┬─────────┘
                   │                             │
                   ↓                             ↓
          ┌──────────────────┐          ┌──────────────────┐
          │    SQLAlchemy    │          │ Solidity Smart   │
          │                  │          │    Contract      │
          └────────┬─────────┘          └────────┬─────────┘
                   │                             │
                   ↓                             ↓
          ┌──────────────────┐          ┌──────────────────┐
          │      SQLite      │          │  Hardhat Local   │
          │     Database     │          │    Blockchain    │
          └──────────────────┘          └──────────────────┘
```

---

# 🧰 Technology Stack

## Frontend

- React
- Vite
- JavaScript
- ethers.js
- MetaMask
- CSS

## Backend

- Python
- FastAPI
- SQLAlchemy
- SQLite
- REST APIs

## Blockchain

- Solidity `0.8.24`
- Hardhat
- OpenZeppelin
- ethers.js
- Ethereum-compatible local blockchain
- MetaMask

## Development Network

```text
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Network: Hardhat Localhost
```

---

# 🔁 Application Workflow

## 1. Connect Wallet

The user connects MetaMask to the CarbonChain application.

```text
Browser
   ↓
MetaMask
   ↓
Wallet Address
   ↓
CarbonChain
```

The wallet address becomes the user's blockchain identity.

---

## 2. Submit Project

A project contains information such as:

- Project ID
- Submitter wallet
- Project name
- Location
- Project type
- CO₂ reduction quantity
- Fingerprint
- Submission timestamp
- Verification status

Initially:

```text
Status = Pending
```

---

## 3. Generate Fingerprint

The application generates a unique fingerprint from project information.

The fingerprint is used to identify projects that may represent the same underlying submission.

```text
Project Information
        ↓
Normalization
        ↓
Fingerprint Generation
        ↓
Duplicate Check
        ↓
Accept / Reject Submission
```

---

# 🔍 Duplicate Detection

Duplicate detection is an important part of CarbonChain.

Without duplicate detection, the same environmental project could potentially be submitted multiple times and receive multiple sets of credits.

CarbonChain therefore associates projects with a fingerprint.

Conceptually:

```text
Project A
   ↓
Fingerprint A
   ↓
Blockchain / Database Registry

New Project
   ↓
Fingerprint
   ↓
Compare
   ↓
Existing Fingerprint?
      │
   ┌──┴──┐
   │     │
  YES    NO
   │     │
Reject   Continue
```

The fingerprint is stored alongside project information so that the system can identify matching submissions.

---

# 👨‍⚖️ Verification & Approval

New projects do not immediately receive credits.

They first enter a verification state.

### Project states

```text
PENDING
   │
   ├──────────────→ REJECTED
   │
   ↓
APPROVED
```

## Pending

The project has been submitted but not yet approved.

## Approved

The project has passed the required verification process and becomes eligible for credit issuance.

## Rejected

The project has been rejected and cannot receive credits.

This prevents arbitrary users from immediately creating carbon credits.

---

# ⛓️ Blockchain Architecture

The blockchain layer is implemented using Solidity.

The local development blockchain is provided by Hardhat.

```text
Hardhat Node
     │
     ├── RPC
     │    └── http://127.0.0.1:8545
     │
     ├── Chain ID
     │    └── 31337
     │
     └── Smart Contract
          └── Carbon Credit Registry
```

The frontend communicates with the smart contract using:

```text
React
  ↓
ethers.js
  ↓
MetaMask
  ↓
Hardhat RPC
  ↓
Solidity Contract
```

---

# 📜 Smart Contract Model

The smart contract maintains project information and credit accounting.

A project contains fields conceptually represented as:

```text
Project
├── id
├── submitter
├── name
├── location
├── projectType
├── co2Tonnes
├── fingerprint
├── status
└── submittedAt
```

---

# 📊 Project Status

CarbonChain uses three primary project states:

```text
Pending
Approved
Rejected
```

### Pending

Project has been submitted.

### Approved

Project has been verified and is eligible for issuance.

### Rejected

Project has failed verification or has otherwise been rejected.

---

# 🪙 Credit Issuance

After project approval, the system calculates the credit quantity based on the verified CO₂ amount.

The current model uses approximately:

```text
1 Carbon Credit ≈ 1 tonne CO₂
```

Therefore:

```text
Verified CO₂ = 100 tonnes

        ↓

Credits Issued ≈ 100
```

The exact issuance logic is controlled by the smart contract/application rules.

---

# 👛 Credit Accounting

CarbonChain currently uses **internal blockchain credit accounting rather than ERC-20 tokens**.

Credits are tracked using project and wallet relationships.

Conceptually:

```text
Project ID
     +
Wallet Address
     ↓
Credit Balance
```

For example:

```text
Project 101
Wallet A
Balance = 50

Project 101
Wallet B
Balance = 25
```

This allows the system to track which wallet owns credits originating from a specific project.

---

# 🏪 Marketplace

CarbonChain includes a fixed-price carbon-credit marketplace.

The marketplace enables users to:

1. View available credits
2. Create listings
3. Set a fixed price
4. Purchase credits
5. Transfer ownership
6. Remove listings when appropriate

Basic workflow:

```text
Credit Owner
     ↓
Create Listing
     ↓
Set Price
     ↓
Marketplace
     ↓
Buyer
     ↓
Purchase
     ↓
Ownership Transfer
```

The marketplace is designed to demonstrate the complete lifecycle of a carbon credit from issuance to market circulation.

---

# 💰 Fixed-Price Trading

The current marketplace uses a simple fixed-price model.

Instead of dynamically calculating prices through an automated market maker, a seller specifies the price for a listing.

Example:

```text
Credits Available: 10
Price: ₹500 / credit

Buyer purchases 4 credits

Remaining:
6 credits
```

This keeps the marketplace logic straightforward and suitable for a prototype/hackathon environment.

---

# 🔄 Ownership Transfer

Credits can move between wallet addresses.

Conceptually:

```text
Wallet A
  │
  │ Transfer 10 Credits
  ↓
Wallet B
```

The blockchain records the resulting balance changes.

This provides a traceable ownership history.

---

# ♻️ Credit Retirement

Retirement represents the point where credits are permanently removed from active circulation.

Example:

```text
Wallet Balance
      ↓
100 Credits
      ↓
Retire 20
      ↓
80 Active Credits
      +
20 Retired Credits
```

Retired credits cannot simply return to the active market.

This is important because a carbon credit should not be allowed to be repeatedly used to claim the same environmental benefit.

---

# 📊 Analytics Dashboard

CarbonChain provides analytics for understanding platform activity.

Typical platform-level metrics include:

```text
┌──────────────────────────────────────────┐
│          CARBONCHAIN ANALYTICS           │
├──────────────────────────────────────────┤
│                                          │
│  🌱 Total Projects                       │
│                                          │
│  🪙 Total Credits Issued                 │
│                                          │
│  💰 Credits Traded                       │
│                                          │
│  ♻️ Credits Retired                      │
│                                          │
│  📈 Active Projects                      │
│                                          │
└──────────────────────────────────────────┘
```

These metrics help users understand the environmental and marketplace activity represented by the platform.

---

# 🖥️ Frontend

The frontend is built using **React + Vite**.

Its responsibilities include:

- Rendering the CarbonChain dashboard
- Project submission
- Project management
- Verification interfaces
- Credit balances
- Marketplace interactions
- Retirement operations
- Analytics
- Wallet connection
- Smart-contract interaction

The frontend communicates with two major systems:

```text
React
 │
 ├── REST API ───────→ FastAPI
 │
 └── Web3 ───────────→ ethers.js → MetaMask → Blockchain
```

---

# ⚙️ Backend

The backend is implemented using **FastAPI**.

It handles application-level functionality such as:

- API requests
- Project management
- Validation
- Database operations
- Duplicate detection support
- Data retrieval
- Analytics data
- Communication between frontend and persistence layer

Architecture:

```text
Frontend
   ↓
FastAPI
   ↓
SQLAlchemy
   ↓
SQLite
```

---

# 🗄️ Database

CarbonChain uses **SQLite** for development persistence.

SQLAlchemy provides the ORM layer.

```text
FastAPI
    ↓
SQLAlchemy ORM
    ↓
SQLite
```

The database is primarily responsible for off-chain application data.

Blockchain state remains the trusted source for blockchain-controlled operations.

This creates a hybrid architecture:

```text
             CarbonChain
                  │
        ┌─────────┴─────────┐
        │                   │
     Off-chain            On-chain
        │                   │
     SQLite             Blockchain
        │                   │
 Application Data     Trusted State
```

---

# 📁 Project Structure

The project is organized into separate application layers.

```text
CarbonChain/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── assets/
│   │   └── ...
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.*
│
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── routes/
│   ├── services/
│   ├── requirements.txt
│   └── ...
│
├── contracts/
│   ├── contracts/
│   │   └── *.sol
│   ├── scripts/
│   ├── test/
│   ├── hardhat.config.*
│   └── ...
│
├── scripts/
│   └── ...
│
├── README.md
└── ...
```

> The exact contents of individual directories may evolve as development continues.

---

# 🔌 Communication Between Components

CarbonChain uses two major communication paths.

## REST API

Used for conventional application data.

```text
React
 ↓
HTTP Request
 ↓
FastAPI
 ↓
SQLAlchemy
 ↓
SQLite
```

## Blockchain

Used for trusted blockchain operations.

```text
React
 ↓
ethers.js
 ↓
MetaMask
 ↓
Hardhat RPC
 ↓
Smart Contract
```

---

# 🔐 Security & Access Control

The smart contract uses **OpenZeppelin AccessControl**.

This provides role-based permission management for privileged operations.

Instead of allowing every wallet to perform every operation:

```text
User
 │
 ├── Normal operations
 │
 └── Restricted operations
          ↓
      Authorized Role
```

This is especially important for operations such as:

- Project approval
- Credit issuance
- Administrative actions

The contract therefore follows the principle:

> **Only authorized actors should be able to perform privileged operations.**

---

# 🛡️ Why Blockchain?

CarbonChain does not use blockchain simply for tokenization.

Blockchain provides several useful properties:

### 🔒 Tamper Resistance

Once blockchain state is recorded, changing historical records becomes difficult.

### 🔍 Transparency

Relevant project and credit operations can be independently verified.

### 👛 Ownership

Wallet addresses provide a clear digital representation of credit ownership.

### 🔄 Traceability

Credits can be followed through:

```text
Issuance
   ↓
Ownership
   ↓
Transfer
   ↓
Marketplace
   ↓
Retirement
```

### ♻️ Retirement Integrity

Retirement provides a permanent endpoint for a credit's active lifecycle.

---

# 🧠 Design Decisions

## Why React + Vite?

Vite provides a lightweight and fast development environment for the React frontend.

## Why FastAPI?

FastAPI provides:

- Fast development
- Python ecosystem support
- Automatic API documentation
- Type validation
- Clean REST architecture

## Why SQLite?

SQLite is lightweight and ideal for:

- Local development
- Hackathon demonstrations
- Rapid prototyping
- Simple persistence

The database can later be replaced with a production-grade database without changing the overall application architecture.

## Why Hardhat?

Hardhat provides a convenient local Ethereum-compatible development environment.

It makes it possible to:

- Run a local blockchain
- Compile Solidity contracts
- Deploy contracts
- Test contracts
- Interact with contracts during development

## Why OpenZeppelin?

OpenZeppelin provides well-tested reusable Solidity components, including access-control functionality.

## Why MetaMask?

MetaMask provides a familiar wallet interface for connecting users to the blockchain and approving transactions.

---

# 🚀 Prerequisites

Install the following before running CarbonChain.

### Required

- Node.js
- npm
- Python 3.x
- pip
- MetaMask browser extension
- Git

### Blockchain Development

- Hardhat
- Solidity compiler through Hardhat

---

# 📥 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/ronak-j4/carbon-credit-platform.git
cd carbon-credit-platform
```

---

# ⚙️ Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

The backend will normally be available at:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

# ⛓️ Blockchain Setup

Open a new terminal and navigate to the contract directory:

```bash
cd contracts
```

Install dependencies:

```bash
npm install
```

Start the local Hardhat blockchain:

```bash
npx hardhat node
```

The local blockchain runs on:

```text
http://127.0.0.1:8545
```

with:

```text
Chain ID: 31337
```

Keep this terminal running.

---

# 📜 Compile Smart Contracts

In another terminal:

```bash
cd contracts
npx hardhat compile
```

Successful compilation generates the required contract artifacts.

---

# 🚀 Deploy Smart Contract

With the Hardhat node running:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

The deployment output will provide the deployed contract address.

That address must be used by the frontend/backend configuration wherever the deployed contract address is required.

---

# 🖥️ Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will display the local frontend URL, typically:

```text
http://localhost:5173
```

---

# 🦊 MetaMask Configuration

CarbonChain uses the local Hardhat network.

Configure MetaMask with:

```text
Network Name: Hardhat Localhost

RPC URL:
http://127.0.0.1:8545

Chain ID:
31337

Currency Symbol:
ETH
```

Hardhat provides development accounts and private keys when the local node starts.

For local development, one of the generated Hardhat accounts can be imported into MetaMask.

> ⚠️ Never use Hardhat development private keys with real funds or on a production network.

---

# ▶️ Running the Complete Project

CarbonChain requires multiple services to run simultaneously.

## Terminal 1 — Blockchain

```bash
cd contracts
npx hardhat node
```

---

## Terminal 2 — Deploy Contract

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

---

## Terminal 3 — Backend

```bash
cd backend
uvicorn main:app --reload
```

---

## Terminal 4 — Frontend

```bash
cd frontend
npm run dev
```

Then open the frontend URL shown by Vite.

---

# 🔄 Complete Runtime Flow

Once all services are running:

```text
                         USER
                          │
                          ↓
                     Web Browser
                          │
              ┌───────────┴───────────┐
              │                       │
              ↓                       ↓
         React Frontend            MetaMask
              │                       │
       ┌──────┴──────┐                │
       │             │                │
       ↓             ↓                ↓
    REST API       ethers.js ─────→ Blockchain
       │                              │
       ↓                              ↓
    FastAPI                     Smart Contract
       │                              │
       ↓                              ↓
    SQLite                     Credit / Project
                                State
```

---

# 🧪 Testing

Smart contracts can be tested through Hardhat.

Run:

```bash
cd contracts
npx hardhat test
```

Tests should cover important operations such as:

- Project creation
- Duplicate prevention
- Project approval
- Project rejection
- Credit issuance
- Credit transfer
- Marketplace listing
- Marketplace purchase
- Credit retirement
- Access control
- Invalid operations

For frontend testing:

```bash
cd frontend
npm run build
```

This verifies that the production build can be generated successfully.

---

# 🔌 API

The FastAPI backend exposes REST endpoints for application-level operations.

The automatically generated API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

FastAPI also provides an OpenAPI specification.

Typical API responsibilities include:

```text
Project Creation
       ↓
Project Retrieval
       ↓
Project Validation
       ↓
Duplicate Checking
       ↓
Database Persistence
       ↓
Analytics / Reporting
```

The exact endpoint names may evolve as the project develops.

---

# 🔐 Security Considerations

CarbonChain is currently designed as a **development/hackathon prototype**.

For production deployment, additional controls would be required.

### Smart Contract

- Professional security audit
- Reentrancy protection where applicable
- Strong input validation
- Robust role management
- Emergency pause mechanism
- Upgrade strategy where required
- Comprehensive automated tests

### Backend

- Authentication and authorization
- Rate limiting
- Input sanitization
- Secure CORS configuration
- Production database
- Secret management
- API monitoring

### Frontend

- Secure environment variables
- Transaction validation
- Network validation
- Wallet-state validation
- Error handling

### Infrastructure

- HTTPS
- Secure RPC provider
- Database backups
- Logging
- Monitoring
- Production deployment configuration

---

# ⚠️ Important Prototype Disclaimer

CarbonChain is a **prototype/hackathon project** intended to demonstrate the technical architecture and workflow of a blockchain-based carbon-credit platform.

It should **not** be interpreted as a certified carbon registry, environmental verification authority, financial marketplace, or legally recognized carbon-credit system.

Real-world deployment would require:

- Regulatory compliance
- Independent project verification
- Accepted carbon-credit methodologies
- Environmental auditing
- Legal review
- Market compliance
- Secure production infrastructure

---

# 🎯 Current Scope

The current platform demonstrates:

```text
✓ Project Registration
✓ Project Fingerprinting
✓ Duplicate Detection
✓ Project Verification
✓ Project Approval / Rejection
✓ Carbon Credit Issuance
✓ Wallet-Based Ownership
✓ Credit Transfer
✓ Marketplace Listings
✓ Credit Purchase
✓ Credit Retirement
✓ Analytics
✓ REST API
✓ SQLite Persistence
✓ Solidity Smart Contract
✓ Hardhat Local Blockchain
✓ MetaMask Integration
✓ Role-Based Access Control
```

---

# 🚀 Future Enhancements

CarbonChain can be extended significantly.

## 🌐 Production Blockchain

Deploy contracts to:

- Ethereum
- Polygon
- Base
- Arbitrum
- Other EVM-compatible networks

---

## 🪙 Token Standards

The current implementation uses internal accounting.

A future version could implement:

```text
ERC-20
```

for fungible carbon credits, or:

```text
ERC-1155
```

for project-specific carbon-credit classes.

---

## 📄 IPFS / Decentralized Documents

Project verification documents could be stored using IPFS.

```text
Verification Document
        ↓
       IPFS
        ↓
Content Hash
        ↓
Blockchain
```

This would allow the blockchain to reference immutable project documentation.

---

## 🔮 AI-Based Verification

AI/ML systems could assist with:

- Project anomaly detection
- Duplicate project detection
- Document analysis
- Emission estimation
- Fraud detection
- Risk scoring

---

## 🌍 IoT Integration

Environmental sensors could automatically provide measurements.

```text
IoT Sensors
     ↓
Environmental Data
     ↓
Validation
     ↓
Carbon Calculation
     ↓
Verification
     ↓
Credit Issuance
```

---

## 📡 Real-World Oracles

Blockchain oracles could connect external environmental data to smart contracts.

---

## 💱 Dynamic Carbon Marketplace

Future versions could introduce:

- Auctions
- Dynamic pricing
- Market analytics
- Price history
- Order books
- Liquidity mechanisms

---

## 🏢 Enterprise Dashboard

Organizations could receive:

- Portfolio management
- Emission-offset tracking
- Purchase history
- Retirement certificates
- ESG reporting

---

# 🌎 Use Cases

CarbonChain can support multiple environmental project categories.

### 🌳 Forestry

Projects involving:

- Reforestation
- Afforestation
- Forest conservation

### ☀️ Renewable Energy

Projects involving:

- Solar
- Wind
- Renewable power generation

### 🌾 Agriculture

Projects involving:

- Sustainable farming
- Soil carbon
- Methane reduction

### 🗑️ Waste Management

Projects involving:

- Landfill methane capture
- Recycling
- Waste-to-energy

### 🌊 Blue Carbon

Projects involving:

- Mangrove restoration
- Wetlands
- Coastal ecosystems

---

# 👥 Platform Participants

CarbonChain can support several roles.

## 🌱 Project Developer

Submits environmental projects and receives eligible credits.

## 🔍 Verifier / Administrator

Reviews projects and controls verification-related actions.

## 💰 Buyer

Purchases carbon credits through the marketplace.

## 👛 Credit Holder

Owns and transfers carbon credits.

## ♻️ Offset User

Retires credits to claim an environmental offset.

---

# 📈 Example End-to-End Scenario

Consider a hypothetical reforestation project.

```text
Project:
Reforestation Initiative

Verified Reduction:
1,000 tonnes CO₂
```

### Step 1 — Registration

The developer submits the project.

```text
Status = Pending
```

### Step 2 — Fingerprinting

The platform generates a project fingerprint.

```text
Project
   ↓
Fingerprint
```

### Step 3 — Duplicate Check

The fingerprint is compared with registered projects.

```text
Duplicate = No
```

### Step 4 — Verification

Authorized personnel approve the project.

```text
Pending → Approved
```

### Step 5 — Issuance

The project becomes eligible for approximately:

```text
1,000 Carbon Credits
```

### Step 6 — Marketplace

The owner lists:

```text
200 Credits
```

at a fixed price.

### Step 7 — Purchase

A buyer purchases:

```text
50 Credits
```

Ownership changes accordingly.

### Step 8 — Retirement

The buyer retires:

```text
50 Credits
```

Those credits are permanently removed from active circulation.

The lifecycle becomes:

```text
Project
  ↓
Verification
  ↓
Approval
  ↓
1,000 Credits
  ↓
Marketplace
  ↓
Ownership Transfer
  ↓
50 Credits Retired
```

---

# 🧩 Core Concept

The central idea behind CarbonChain is:

> **Create a transparent and traceable lifecycle for carbon credits from project registration to permanent retirement.**

Instead of treating a carbon credit as only a number in a database, CarbonChain treats it as an asset whose lifecycle can be tracked.

```text
                   CARBONCHAIN

                ┌───────────────┐
                │    PROJECT    │
                └───────┬───────┘
                        ↓
                ┌───────────────┐
                │  VERIFICATION │
                └───────┬───────┘
                        ↓
                ┌───────────────┐
                │    ISSUANCE   │
                └───────┬───────┘
                        ↓
                ┌───────────────┐
                │   OWNERSHIP   │
                └───────┬───────┘
                        ↓
                ┌───────────────┐
                │  MARKETPLACE  │
                └───────┬───────┘
                        ↓
                ┌───────────────┐
                │   TRANSFER    │
                └───────┬───────┘
                        ↓
                ┌───────────────┐
                │   RETIREMENT  │
                └───────────────┘
```

---

# 🎓 Learning Outcomes

This project demonstrates practical implementation of:

### Blockchain

- Smart contracts
- Solidity
- Ethereum-compatible networks
- Wallet integration
- On-chain state
- Access control

### Web3

- ethers.js
- MetaMask
- Blockchain transactions
- Wallet addresses
- Contract interaction

### Backend

- FastAPI
- REST APIs
- SQLAlchemy
- Database persistence
- Application architecture

### Frontend

- React
- Vite
- Component-based architecture
- API integration
- Web3 integration
- Responsive UI

### Software Engineering

- Full-stack architecture
- Separation of concerns
- Database design
- Smart-contract design
- API design
- Security considerations
- End-to-end application workflows

---

# 🏆 Why CarbonChain?

CarbonChain combines multiple technologies to solve a single real-world problem.

```text
                 ┌──────────────┐
                 │   Carbon     │
                 │   Projects   │
                 └──────┬───────┘
                        │
                        ↓
              ┌──────────────────┐
              │   CarbonChain    │
              └────────┬─────────┘
                       │
       ┌───────────────┼────────────────┐
       ↓               ↓                ↓
   Blockchain        Backend         Frontend
       │               │                │
 Smart Contracts    FastAPI          React
       │               │                │
 Ownership          Database         UX
       │               │                │
       └───────────────┼────────────────┘
                       ↓
             Transparent Carbon
                Credit Lifecycle
```

---

# 🛠️ Development Notes

When developing locally, start the services in this order:

```text
1. Hardhat Node
       ↓
2. Smart Contract Deployment
       ↓
3. Backend
       ↓
4. Frontend
       ↓
5. MetaMask Connection
       ↓
6. Application Usage
```

If the blockchain is restarted, previously deployed local contract state may no longer exist.

In that situation:

```text
Restart Hardhat
      ↓
Redeploy Contract
      ↓
Update Contract Address
      ↓
Restart Frontend if required
```

---

# 🐛 Troubleshooting

## MetaMask cannot connect

Check:

```text
RPC:
http://127.0.0.1:8545

Chain ID:
31337
```

Make sure the Hardhat node is running.

---

## Transaction fails

Check:

- MetaMask is connected to the correct network
- Correct account is selected
- Contract is deployed
- Contract address is correct
- Account has sufficient local ETH
- Required role is assigned

---

## Frontend cannot reach backend

Make sure FastAPI is running:

```bash
uvicorn main:app --reload
```

Then verify:

```text
http://127.0.0.1:8000/docs
```

---

## Contract not found

Redeploy:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Then update the contract address used by the frontend.

---

# 📜 License

This project is developed as an educational and hackathon-oriented prototype.

If a formal open-source license is added, replace this section with the selected license, for example:

```text
MIT License
```

---

# 👨‍💻 Team

**CarbonChain** was developed as a collaborative full-stack blockchain project.

### Project Areas

- 🌐 Frontend Development
- ⚙️ Backend Development
- ⛓️ Blockchain / Smart Contracts
- 🧠 Data / ML Components
- 🎨 UI/UX
- 📊 Analytics

---

# 🌱 CarbonChain

### **Making Carbon Credits More Transparent, Traceable & Trustworthy**

```text
REGISTER
    ↓
VERIFY
    ↓
ISSUE
    ↓
TRADE
    ↓
TRANSFER
    ↓
RETIRE
    ↓
TRACK IMPACT
```

---

<p align="center">

**Built with 🌱 sustainability + ⛓️ blockchain + 💻 technology**

</p>
