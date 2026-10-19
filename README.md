# 🌱 CarbonChain

### Decentralized Carbon Credit Registry, Multi-Sig Verification, GIS Geofencing & Marketplace

> **CarbonChain** is an enterprise-grade, full-stack decentralized carbon credit management platform. It unites **GIS geospatial boundary mapping, two-distinct-verifier multi-sig approval gating, cryptographic MRV document commitments, credit batch provenance tracking, QR-verifiable retirement certificates, a peer-to-peer trading marketplace, and a trustless public audit explorer** into a single transparent workflow powered by **Ethereum-Compatible Smart Contracts (Solidity), Hardhat, FastAPI (Python), React (Vite), and SQLite**.

---

<p align="center">
  <img src="https://img.shields.io/badge/Blockchain-Ethereum%20Compatible-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white" alt="Blockchain">
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity">
  <img src="https://img.shields.io/badge/React-18%20(Vite)-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-Python%203.11+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/GIS-Leaflet%20%2B%20Shapely-4E5EE4?style=for-the-badge&logo=leaflet&logoColor=white" alt="GIS">
  <img src="https://img.shields.io/badge/Smart%20Contracts-OpenZeppelin%20AccessControl-4E5EE4?style=for-the-badge" alt="OpenZeppelin">
  <img src="https://img.shields.io/badge/Tests-34%20Passing%20(100%25)-22c55e?style=for-the-badge" alt="Tests">
</p>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [The Problem in Traditional Carbon Markets](#-the-problem-in-traditional-carbon-markets)
- [Our Solution & Architectural Innovations](#-our-solution--architectural-innovations)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Core Functional Modules](#-core-functional-modules)
  - [1. GIS Geospatial Mapping & Overlap Protection](#1-gis-geospatial-mapping--overlap-protection)
  - [2. Deterministic Keccak-256 Fingerprinting](#2-deterministic-keccak-256-fingerprinting)
  - [3. Two-Distinct-Verifier Gating (Solidity Multi-Sig)](#3-two-distinct-verifier-gating-solidity-multi-sig)
  - [4. Credit Batch Provenance & Lifecycle Tracking](#4-credit-batch-provenance--lifecycle-tracking)
  - [5. Off-Chain Document Storage with On-Chain Hashes](#5-off-chain-document-storage-with-on-chain-hashes)
  - [6. Credit Accounting, Transfers & P2P Marketplace](#6-credit-accounting-transfers--p2p-marketplace)
  - [7. Permanent Retirement & QR-Verifiable Certificates](#7-permanent-retirement--qr-verifiable-certificates)
  - [8. Public Trustless Audit Explorer](#8-public-trustless-audit-explorer)
  - [9. Visual Identity & Dual-Theme UI](#9-visual-identity--dual-theme-ui)
- [Complete Carbon Credit Lifecycle Flow](#-complete-carbon-credit-lifecycle-flow)
- [Smart Contract Specification](#-smart-contract-specification)
- [Project Directory Structure](#-project-directory-structure)
- [API Reference](#-api-reference)
- [Prerequisites](#-prerequisites)
- [Installation & Local Setup Guide](#-installation--local-setup-guide)
- [MetaMask Configuration & Demo Accounts](#-metamask-configuration--demo-accounts)
- [Automated Testing Suite](#-automated-testing-suite)
- [Security & Access Control Matrix](#-security--access-control-matrix)
- [Troubleshooting](#-troubleshooting)
- [Roadmap & Future Enhancements](#-roadmap--future-enhancements)
- [License & Acknowledgements](#-license--acknowledgements)

---

# 🌍 Overview

Carbon credits represent independently verified reductions or removals of greenhouse-gas emissions (1 credit ≈ 1 metric tonne of CO₂ equivalent).

However, traditional voluntary and compliance carbon credit markets are plagued by severe systemic flaws:
- **Double Counting & Overlapping Land Claims**: Multiple developers claiming the same physical forest, farm, or solar installation.
- **Unilateral Verification Fraud**: A single corrupt verifier or self-interested developer approving their own projects.
- **Lost Provenance**: Credits bundled and resold repeatedly without verifiable lineage back to their specific project vintage.
- **Document Tampering**: Auditing reports and baseline measurements altered after the fact.
- **Zombie Retirements**: Credits claimed as retired for corporate offsetting while remaining active and tradeable in back-channel brokerages.

**CarbonChain** resolves these challenges by anchoring the entire lifecycle to **immutable blockchain smart contracts**, enforcing **strict mathematical two-verifier approval multi-sig**, calculating **real-time GIS spatial overlap geometry**, committing **cryptographic hashes of MRV audit documents**, and issuing **permanent, QR-verifiable retirement certificates**.

---

# ❗ The Problem in Traditional Carbon Markets

| Vulnerability | Traditional Market Reality | CarbonChain Blockchain Solution |
|---|---|---|
| **Land Duplication** | Same forest or farm registered across different registries. | **GIS Boundary Mapping & Shapely Overlap Protection** prevents overlapping claims. |
| **Verification Bias** | Single centralized auditor signs off with no multi-party checks. | **Two-Distinct-Verifier Gating (Solidity Enforced)** requiring 2 separate verifier signatures. |
| **Self-Verification** | Project owners with auditing credentials approving their own projects. | **Submitter Exclusion Rule** (`msg.sender != project.submitter`) enforced in smart contract. |
| **Audit Document Fraud** | PDF audit reports modified without trace. | **Cryptographic Keccak-256 document hashes** permanently committed on-chain. |
| **Double Selling** | Credits sold simultaneously to multiple corporate buyers. | **Smart Contract Escrow & Balances** tracking real-time ownership per wallet address. |
| **Unverifiable Offsetting** | Static PDF certificate with no tamper-proof cryptographic backing. | **On-Chain Retirement Records & QR-Scannable Public Explorer Certificates**. |

---

# 💡 Our Solution & Architectural Innovations

CarbonChain combines a responsive, modern Web application with an authoritative smart contract layer, dividing responsibilities cleanly:

```text
                     ┌─────────────────────────────┐
                     │           USER              │
                     │      Browser + MetaMask     │
                     └──────────────┬──────────────┘
                                    │
                                    ↓
                     ┌─────────────────────────────┐
                     │   React + Vite Frontend     │
                     │  (Light/Dark Theme + GIS)   │
                     └──────────────┬──────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                     ↓                             ↓
           ┌──────────────────┐          ┌──────────────────┐
           │   FastAPI REST   │          │     ethers.js    │
           │   API (Python)   │          │    Web3 Layer    │
           └────────┬─────────┘          └────────┬─────────┘
                    │                             │
                    ↓                             ↓
           ┌──────────────────┐          ┌──────────────────┐
           │ Shapely GIS + DB │          │ Solidity Smart   │
           │ (SQLite Storage) │          │    Contract      │
           └──────────────────┘          └────────┬─────────┘
                                                  │
                                                  ↓
                                         ┌──────────────────┐
                                         │  Hardhat Local   │
                                         │    Blockchain    │
                                         └──────────────────┘
```

1. **Authoritative Blockchain State**: Credit issuance, wallet balances, verifier approvals, credit listings, and retirements are exclusively executed and authored on-chain.
2. **Off-Chain High-Performance Engine**: Heavy GIS coordinates, full project descriptions, and MRV verification files remain off-chain for fast search and zero gas overhead, while their cryptographic fingerprints and spatial boundaries are anchored to the contract.
3. **Multi-Party Multi-Sig**: Project approval requires two distinct authorized addresses before a single carbon credit can be minted.

---

# ✨ Key Features

| Category | Feature | Description |
|---|---|---|
| 🗺️ **GIS Geofencing** | **Interactive Polygon Mapping** | Draw and inspect multi-point GPS project boundaries using Leaflet with satellite and street overlays. |
| 🛡️ **Spatial Protection** | **Real-Time Overlap Detection** | Prevents double-counting by detecting physical spatial overlap with existing projects via Shapely geometry. |
| 🔐 **Multi-Sig Approval** | **Two-Distinct-Verifier Gating** | Solidity smart contract enforces that 2 distinct authorized verifier addresses approve before credit minting. |
| 🚫 **Fraud Prevention** | **Submitter Approval Ban** | Smart contract strictly blocks project submitters from verifying their own submissions. |
| 📜 **Batch Provenance** | **Credit Batch Lineage** | Every issuance creates an on-chain batch record tracking vintage, total supply, active supply, and retired supply. |
| 📄 **Document Anchoring** | **Keccak-256 Audit Hashes** | Off-chain MRV documents are cryptographically hashed and permanently committed on-chain with real-time verification. |
| 🪙 **Credit Accounting** | **Per-Project Balances** | Wallet credit balances are tracked on a per-project token ID basis, preserving project origin and integrity. |
| 🏪 **Marketplace** | **P2P Escrow Trading** | Sell credits at fixed ETH prices with automated smart contract escrow, instant settlement, and partial fills. |
| ♻️ **Permanent Retirement** | **QR-Verifiable Certificates** | Irreversible on-chain retirement with custom beneficiary, reason, downloadable PDF certificate, and verification QR code. |
| 🔍 **Public Explorer** | **Trustless Audit Registry** | Unified public explorer to search project provenance, verify QR certificates, or audit wallet holdings. |
| 🎨 **Modern UX** | **Light/Dark Theme** | Clean responsive light mode default with dark mode toggle, realistic domain imagery, and progress analytics. |

---

# 🧰 Technology Stack

### Blockchain & Smart Contracts
- **Solidity `0.8.24`**: Smart contract programming language.
- **OpenZeppelin Contracts**: Industry-standard `AccessControl` role management.
- **Hardhat**: Development environment, compilation, local Ethereum node, and automated testing framework.
- **ethers.js v6**: JavaScript Web3 client connecting React components to contract ABIs and signers.

### Backend & GIS Engine
- **Python 3.11+**: Primary backend language.
- **FastAPI**: High-performance asynchronous REST API framework with auto-generated OpenAPI/Swagger documentation.
- **Shapely & PyProj**: Geospatial geometry processing, polygon intersection calculations, and WGS84 geodesic area measurement.
- **SQLAlchemy & SQLite**: Relational database ORM for off-chain project metadata, coordinates, and document records.
- **Web3.py**: Python blockchain integration for backend verification and demo signer interactions.

### Frontend & User Interface
- **React 18 & Vite**: Modern frontend library with hot module replacement (HMR).
- **Leaflet & React-Leaflet**: Geospatial polygon drawing, boundary rendering, and satellite imagery overlays.
- **Recharts**: Interactive carbon analytics, vintage distributions, and cumulative capacity charting.
- **Lucide React**: Clean, modern iconography across all panels.
- **jsPDF & html2canvas**: Client-side cryptographic certificate generation and PDF downloading.
- **QRCode**: Real-time generation of scan-to-verify data URLs.

---

# 🔬 Core Functional Modules

### 1. GIS Geospatial Mapping & Overlap Protection
- **Interactive Geofencing**: During project submission, users draw their exact project perimeter on an interactive Leaflet map with Leaflet.Draw, generating standard GeoJSON polygon coordinates.
- **Spatial Overlap Engine**: The FastAPI backend evaluates the submitted polygon against all registered projects in the SQLite database using `shapely.geometry.Polygon`.
- **Threshold Gating**: If a new submission overlaps an existing project beyond the configured threshold (`overlap_threshold_percent: 1.0%` or `overlap_threshold_area_km2: 0.001 km²`), the submission is rejected with a detailed spatial conflict report.

### 2. Deterministic Keccak-256 Fingerprinting
- **Data Normalization**: Project name, location, project type, and crediting period (`startDate` — `endDate`) are normalized, concatenated, and hashed:
  $$\text{Fingerprint} = \text{keccak256}(\text{name} \parallel \text{location} \parallel \text{type} \parallel \text{startDate} \parallel \text{endDate})$$
- **On-Chain Collision Guard**: The contract maintains `mapping(bytes32 => bool) public fingerprintTaken`. Any attempt to register an identical project and period reverts immediately on-chain.

### 3. Two-Distinct-Verifier Gating (Solidity Multi-Sig)
- **Multi-Sig Requirement**: `REQUIRED_VERIFIERS = 2`. A single verifier cannot unilaterally mint carbon credits.
- **Step 1 (First Approval)**: When the first verifier signs, the contract records the address in `projectVerifiers[projectId]`, marks `hasApproved[projectId][verifier] = true`, increments `approvalsCount`, and emits `ProjectPartiallyApproved`. The project remains `Pending`.
- **Step 2 (Second Approval)**: A second, distinct verifier signs. The contract confirms `hasApproved[projectId][verifier] == false`, changes project status to `Approved`, mints credits into the submitter's balance, and issues an on-chain provenance batch.
- **Self-Approval Prevention**: The contract checks `require(msg.sender != project.submitter, "Submitter cannot verify own project")`.

### 4. Credit Batch Provenance & Lifecycle Tracking
- **On-Chain Credit Batches**: Each approved project creates an immutable `CreditBatch` struct:
  ```solidity
  struct CreditBatch {
      uint256 batchId;
      uint256 projectId;
      uint256 totalSupply;
      uint256 activeSupply;
      uint256 retiredSupply;
      string vintage;
      uint256 mintedAt;
  }
  ```
- **Lifecycle Accounting**: When credits from a project are retired, `activeSupply` decreases and `retiredSupply` increases proportionately, guaranteeing accurate provenance from mint to retirement.

### 5. Off-Chain Document Storage with On-Chain Hashes
- **Off-Chain Storage**: Heavy MRV audit reports, satellite telemetry, and baseline carbon calculations are uploaded to the FastAPI backend.
- **Cryptographic Anchoring**: The server computes the Keccak-256 cryptographic hash of the document bytes. The verifier then commits this hash on-chain via `attachVerificationDocument(projectId, docHash, docType, uri)`.
- **Integrity Verification**: Anyone can query `/api/projects/{id}/documents/{hash}/verify` to re-hash the stored file and cryptographically prove that the document has not been altered since verification.

### 6. Credit Accounting, Transfers & P2P Marketplace
- **Project-Specific Balances**: Credits are tracked per project ID (`creditBalance[projectId][wallet]`), preserving the distinction between a solar credit from India and a mangrove credit from Indonesia.
- **Direct Transfers**: Credit owners can transfer credits directly to any recipient wallet address via `transferCredits(projectId, to, amount)`.
- **Trustless Marketplace**:
  - Sellers create listings with `createListing(projectId, amount, pricePerCredit)`. The smart contract escrows the credits.
  - Buyers send exact ETH value via `buyListing(listingId, amount)`.
  - The contract transfers ETH directly to the seller, transfers credits to the buyer, and updates or closes the listing automatically. Partial fills are supported.
  - Sellers can cancel listings at any time with `cancelListing(listingId)`, returning escrowed credits to their wallet.

### 7. Permanent Retirement & QR-Verifiable Certificates
- **Irreversible Retirement**: Calling `retireCreditsWithDetails(projectId, amount, beneficiary, reason)` permanently deducts credits from the user's balance and increments `totalRetired[projectId]`. Retired credits can never be re-listed, transferred, or double-spent.
- **Permanent On-Chain Record**: Creates an immutable `RetirementRecord`:
  ```solidity
  struct RetirementRecord {
      uint256 certificateId;
      uint256 projectId;
      address retiree;
      string beneficiary;
      string retirementReason;
      uint256 amount;
      uint256 timestamp;
  }
  ```
- **QR Certificate**: A certificate ID is issued with a QR code pointing directly to the Public Audit Explorer. Users can download a verified PDF certificate complete with cryptographic transaction hashes, beneficiary metadata, and project origins.

### 8. Public Trustless Audit Explorer
- Located at `/explorer`, the public explorer provides trustless verification across 3 tabs:
  1. **Project Provenance & Multi-Sig Audit**: Inspect multi-sig verifier signatures, GIS boundary geofences, Keccak-256 fingerprints, and credit batch supply tables.
  2. **QR Certificate Verification**: Scan or input a Certificate ID to verify retirement authenticity against on-chain records.
  3. **Wallet Portfolio Audit**: Audit any wallet address to view active credit holdings, project provenance, and retirement history.

### 9. Visual Identity & Dual-Theme UI
- **Light/Dark Mode**: Clean, high-contrast light mode default with a global theme toggle and persistent local storage state.
- **Domain-Specific Photography**: Realistic, curated photography auto-allocated based on project metadata (Solar, Wind, Forest, Regenerative Farm, Mangrove Blue Carbon, Biogas).
- **Carbon Allocation Progress Bars**: Dynamic progress bars calculating active vs. retired credit utilization from authoritative contract data.

---

# 🔄 Complete Carbon Credit Lifecycle Flow

```text
 1. SUBMISSION          Developer inputs project data & draws GIS polygon boundary
      ↓
 2. SPATIAL CHECK       FastAPI + Shapely verifies zero geographic overlap with existing claims
      ↓
 3. FINGERPRINTING      Deterministic Keccak-256 hash registered on-chain in Pending state
      ↓
 4. VERIFIER 1 SIG      First authorized verifier reviews GIS & audit docs; signs Approval 1/2
      ↓
 5. VERIFIER 2 SIG      Distinct second verifier reviews & signs; satisfies 2/2 Multi-Sig threshold
      ↓
 6. BATCH ISSUANCE      Smart contract mints credits & creates on-chain Provenance Batch record
      ↓
 7. P2P MARKETPLACE     Owner lists credits in smart contract escrow; buyer purchases with ETH
      ↓
 8. RETIREMENT          Owner permanently burns credits for an offset claim
      ↓
 9. QR CERTIFICATE      Contract issues immutable Retirement Record & generates verification QR
      ↓
10. PUBLIC AUDIT        Anyone verifies authenticity via Public Audit Explorer (/explorer)
```

---

# 📜 Smart Contract Specification

**Contract Name**: `CarbonCreditPlatform.sol`  
**Standard**: Ethereum-compatible, OpenZeppelin `AccessControl`

### Roles
- `DEFAULT_ADMIN_ROLE`: Contract deployer; can grant and revoke administrative and verifier roles.
- `VERIFIER_ROLE`: Authorized verifiers; can approve/reject projects and attach cryptographic document hashes.

### Key State Mappings & Structures
```solidity
uint256 public constant REQUIRED_VERIFIERS = 2;

mapping(uint256 => Project) public projects;
mapping(bytes32 => bool) public fingerprintTaken;
mapping(uint256 => address[]) private projectVerifiers;
mapping(uint256 => mapping(address => bool)) public hasApproved;
mapping(uint256 => CreditBatch[]) private projectBatches;
mapping(uint256 => VerificationDoc[]) private projectDocuments;
mapping(uint256 => mapping(address => uint256)) public creditBalance;
mapping(uint256 => uint256) public totalRetired;
mapping(uint256 => Listing) public listings;
mapping(uint256 => RetirementRecord) public retirementRecords;
mapping(address => uint256[]) private retireeRetirements;
```

### Core External Functions
- `submitProject(bytes32 fingerprint, uint256 co2Tonnes)`: Registers a pending project.
- `approveProject(uint256 projectId)`: Records a verifier approval. Triggers credit minting upon the 2nd distinct approval.
- `rejectProject(uint256 projectId)`: Verifier rejects a pending project, freeing the fingerprint.
- `attachVerificationDocument(uint256 projectId, bytes32 docHash, string docType, string uri)`: Commits document hash on-chain.
- `transferCredits(uint256 projectId, address to, uint256 amount)`: Transfers credit ownership.
- `createListing(uint256 projectId, uint256 amount, uint256 pricePerCredit)`: Escrows credits for sale.
- `buyListing(uint256 listingId, uint256 amount)`: Purchases credits with ETH.
- `cancelListing(uint256 listingId)`: Returns escrowed credits to the seller.
- `retireCreditsWithDetails(uint256 projectId, uint256 amount, string beneficiary, string retirementReason)`: Burns credits and creates a retirement certificate.
- `getProjectVerifiers(uint256 projectId)`: Returns list of approved verifier addresses.
- `getProjectBatches(uint256 projectId)`: Returns all minted provenance batches for a project.
- `getProjectDocuments(uint256 projectId)`: Returns all committed document records.
- `getRetirementRecord(uint256 certificateId)`: Returns immutable retirement certificate details.

---

# 📁 Project Directory Structure

```text
carbon-credit-platform/
├── contracts/
│   └── CarbonCreditPlatform.sol         # Solidity smart contract with Multi-Sig & Provenance
├── test/
│   └── CarbonCreditPlatform.test.js     # 34 automated Hardhat tests
├── scripts/
│   └── deploy.js                        # Hardhat deployment script
├── hardhat.config.js                    # Hardhat network & compiler configuration
│
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI application entrypoint & CORS
│   │   ├── config.py                    # Environment settings, RPC URL & contract address
│   │   ├── database.py                  # SQLAlchemy engine & session setup
│   │   ├── models.py                    # SQLite tables: project_metadata, verification_documents
│   │   ├── schemas.py                   # Pydantic validation schemas
│   │   ├── blockchain.py                # Web3.py wrapper & demo accounts
│   │   ├── duplicate_detection.py       # Shapely GIS spatial overlap detection engine
│   │   ├── contract_abi.json            # Synchronized contract ABI
│   │   └── routers/
│   │       ├── projects.py              # API routes: projects, documents, certificates, transfer
│   │       └── marketplace.py           # API routes: marketplace listings
│   └── requirements.txt                 # Python dependencies (FastAPI, Shapely, Web3, etc.)
│
├── frontend/
│   ├── public/
│   │   ├── icons/                       # Project type icons (solar, wind, tree, biogas)
│   │   └── images/projects/             # Real-world domain photos (solar.jpg, farm.svg, etc.)
│   ├── src/
│   │   ├── api/client.js                # Axios/fetch API client for backend communication
│   │   ├── components/
│   │   │   ├── ErrorBoundary.jsx        # Component crash boundary with stack trace display
│   │   │   ├── Sidebar.jsx              # Responsive navigation with theme toggle & account badge
│   │   │   ├── ProjectCard.jsx          # Project card with multi-sig gating & allocation bars
│   │   │   ├── ProjectMapBoundary.jsx   # Interactive Leaflet drawing component for submissions
│   │   │   ├── ProjectLocationModal.jsx # Fullscreen GIS boundary inspection modal
│   │   │   └── ActivityTimeline.jsx     # On-chain event log timeline component
│   │   ├── context/
│   │   │   └── ThemeContext.jsx         # Light/Dark mode state provider
│   │   ├── contract/
│   │   │   ├── config.js                # Contract address & network constants
│   │   │   └── CarbonCreditPlatform.abi.json
│   │   ├── hooks/
│   │   │   ├── useWallet.js             # MetaMask connection & ethers.js provider hook
│   │   │   └── useAccountLabels.js      # Human-friendly demo account alias hook
│   │   ├── pages/
│   │   │   ├── Landing.jsx              # Platform homepage & feature showcase
│   │   │   ├── ProjectsList.jsx         # Project registry with status & search filters
│   │   │   ├── SubmitProject.jsx        # Project submission with GIS map drawing & proof card
│   │   │   ├── Marketplace.jsx          # P2P marketplace with fixed ETH pricing & buy modal
│   │   │   ├── Explorer.jsx             # Public Audit Explorer (Provenance, QR Certs, Wallets)
│   │   │   └── Dashboard.jsx            # Recharts analytics dashboard & platform metrics
│   │   ├── utils/
│   │   │   ├── certificate.js           # QR code generation & PDF download utility
│   │   │   ├── projectImages.js         # Domain photo allocation & fallback handler
│   │   │   └── projectTypeIcons.js      # Project category icon mapper
│   │   ├── App.jsx                      # Route definitions & ErrorBoundary wrapper
│   │   └── main.jsx                     # React DOM root with ThemeProvider
│   └── package.json
└── README.md
```

---

# 🔌 API Reference

FastAPI provides an interactive OpenAPI interface available at `http://127.0.0.1:8000/docs`.

### Projects & Metadata
- `GET /api/projects`: List all registered projects with metadata, verifiers, batches, and document counts.
- `GET /api/projects/{project_id}`: Retrieve full metadata for a specific project.
- `POST /api/projects/record`: Record project metadata, GIS coordinates, and center point after on-chain submission.
- `POST /api/projects/check-duplicate`: Check a proposed project for fingerprint collisions or GIS polygon overlap.

### Document Verification
- `POST /api/projects/{project_id}/documents/upload`: Upload an off-chain MRV document, calculate its Keccak-256 hash, and prepare it for on-chain anchoring.
- `GET /api/projects/{project_id}/documents/{doc_hash}`: Download stored document.
- `GET /api/projects/{project_id}/documents/{doc_hash}/verify`: Cryptographically verify stored document bytes against on-chain hash.

### Certificates & Audits
- `GET /api/certificates/{certificate_id}`: Fetch immutable on-chain retirement record and project metadata for QR verification.
- `GET /api/accounts/demo`: List demo account aliases and addresses available for local testing.

---

# 🚀 Prerequisites

Ensure the following tools are installed:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Python**: v3.11 or higher
- **MetaMask**: Browser extension installed (Chrome, Brave, Edge, or Firefox)
- **Git**: Version control

---

# 📥 Installation & Local Setup Guide

### 1. Clone Repository
```bash
git clone https://github.com/ronak-j4/carbon-credit-platform.git
cd carbon-credit-platform
```

### 2. Blockchain Setup (Root Directory)
```bash
npm install
npx hardhat compile
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

### 4. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

---

# ▶️ Running the Application

To run the complete platform, start the services in 4 separate terminal windows:

### Terminal 1: Local Hardhat Node
```bash
npx hardhat node
```
*Starts local Ethereum RPC at `http://127.0.0.1:8545` on Chain ID `31337`.*

### Terminal 2: Deploy Smart Contract
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*Deploys `CarbonCreditPlatform.sol` and grants `DEFAULT_ADMIN_ROLE` and `VERIFIER_ROLE` to Account #0.*

### Terminal 3: FastAPI Backend
```bash
cd backend
# Activate venv if not already active:
# venv\Scripts\activate (Windows) or source venv/bin/activate (macOS/Linux)
uvicorn app.main:app --reload --port 8000
```
*API running at `http://127.0.0.1:8000` (Docs at `/docs`).*

### Terminal 4: React Frontend
```bash
cd frontend
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

# 🦊 MetaMask Configuration & Demo Accounts

### Network Setup in MetaMask
1. Open MetaMask ➔ **Settings** ➔ **Networks** ➔ **Add Network** ➔ **Add a network manually**.
2. Fill in:
   - **Network Name**: `Hardhat Local`
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
3. Click **Save** and switch to `Hardhat Local`.

### Pre-Configured Test Accounts

| Role | Alias | Public Address | Private Key |
|---|---|---|---|
| **Admin & 1st Verifier** | `admin` (Account #0) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Project Developer** | `companyA` (Account #1) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Credit Seller / Trader** | `companyB` (Account #2) | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| **Credit Buyer / Retiree** | `buyer` (Account #3) | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| **2nd Verifier (Multi-Sig)** | `verifier2` (Account #5) | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` |

> 💡 **Testing Two-Verifier Approval**:
> 1. Submit a project using `Company A` (`0x7099...`).
> 2. Switch MetaMask to `admin` (`0xf39F...`) ➔ click **Approve as Verifier (Step 1/2)**.
> 3. Switch MetaMask to `verifier2` (`0x9965...`) ➔ click **Approve as Verifier (Step 2/2)**.
> 4. The contract confirms the 2/2 threshold, changes status to **Approved**, and mints the carbon credits to `Company A`.

---

# 🧪 Automated Testing Suite

The repository includes a comprehensive Hardhat unit test suite testing all smart contract behaviors:

```bash
npx hardhat test
```

### Test Coverage Summary:
```text
  CarbonCreditPlatform
    Roles
      ✓ gives the deployer both admin and verifier roles
      ✓ allows granting and checking verifier roles
    Project submission
      ✓ lets anyone submit a project and stores it as Pending
      ✓ rejects a submission with zero CO2 tonnes
      ✓ BLOCKS a duplicate project (same name, location, type, AND period)
      ✓ treats the SAME project with a DIFFERENT period as a distinct project
      ✓ treats genuinely different projects as unique
    Two-Distinct-Verifier Gating & Multi-Sig Verification
      ✓ enforces that 1 approval keeps project pending and does NOT mint credits yet
      ✓ prevents the SAME verifier from approving twice
      ✓ prevents the submitter from verifying their own project even if they have verifier role
      ✓ prevents non-verifiers from approving
      ✓ mints credits and issues provenance batch upon the 2nd distinct verifier approval
      ✓ lets a verifier reject a project and frees the fingerprint for resubmission
      ✓ cannot approve an already approved project
    Off-Chain Document Cryptographic Commitments
      ✓ allows authorized participants to commit cryptographic document hashes on-chain
      ✓ rejects attaching zero document hash
      ✓ rejects unauthorized strangers from attaching documents
    Credit Batch Provenance & Lifecycle
      ✓ creates an on-chain credit batch with full initial supply
      ✓ updates batch active and retired supplies upon credit retirement
    Retirement Records & Certificates
      ✓ issues a certificate with detailed beneficiary and retirement reason
      ✓ prevents retiring more credits than owned
    Trading and retirement
      ✓ allows the credit holder to transfer credits to a buyer
      ✓ prevents transferring more credits than owned
      ✓ allows retiring credits permanently
      ✓ prevents retiring more credits than owned
    Marketplace
      ✓ lets a credit holder create a listing and escrows the credits
      ✓ prevents listing more credits than owned
      ✓ lets the seller cancel a listing and returns escrowed credits
      ✓ prevents a non-seller from cancelling a listing
      ✓ lets a buyer purchase the full listing amount, paying ETH to the seller
      ✓ supports partial fills, keeping the listing active with a reduced amount
      ✓ rejects a purchase with incorrect ETH sent
      ✓ rejects buying more than the listing's remaining amount
      ✓ rejects buying from a cancelled listing

  34 passing (13s)
```

To verify the production frontend build:
```bash
cd frontend
npm run build
```

---

# 🔐 Security & Access Control Matrix

| Operation | Smart Contract Function | Allowed Callers | Security Enforcements |
|---|---|---|---|
| **Submit Project** | `submitProject` | Any Wallet | Validates `co2Tonnes > 0`, checks fingerprint uniqueness. |
| **Approve Project** | `approveProject` | `VERIFIER_ROLE` | Requires 2 distinct verifier signatures; blocks project submitters. |
| **Reject Project** | `rejectProject` | `VERIFIER_ROLE` | Only pending projects can be rejected; releases fingerprint. |
| **Attach Document Hash** | `attachVerificationDocument` | Submitter or Verifier | Validates non-zero `bytes32` hash; records uploader and timestamp. |
| **Transfer Credits** | `transferCredits` | Credit Owner | Requires sufficient active credit balance; prevents zero transfers. |
| **Create Listing** | `createListing` | Credit Owner | Automatically escrows credits into contract balance. |
| **Buy Listing** | `buyListing` | Any Buyer | Requires exact ETH payment; transfers funds directly to seller. |
| **Cancel Listing** | `cancelListing` | Listing Seller | Releases escrowed credits back to the seller. |
| **Retire Credits** | `retireCreditsWithDetails` | Credit Owner | Irreversibly deducts balance, updates batch retired supply, issues certificate. |

---

# 🐛 Troubleshooting

### 1. MetaMask "out of result range" or Nonce Issues
- **Cause**: Restarting Hardhat node wipes on-chain transactions, leaving MetaMask with a stale account nonce cache.
- **Fix**: In MetaMask, go to **Settings** ➔ **Advanced** ➔ **Clear activity tab data** (or Reset Account). Refresh the page.

### 2. Contract Not Deployed / Wrong Network
- Ensure MetaMask is connected to `Hardhat Local` (`http://127.0.0.1:8545`, Chain ID `31337`).
- Verify `CONTRACT_ADDRESS` in `frontend/src/contract/config.js` matches the deployed address from `scripts/deploy.js`.

### 3. Backend CORS / SQLite Missing
- Confirm FastAPI is running at `http://127.0.0.1:8000`.
- If `carbon_credits.db` is missing, starting the FastAPI server will automatically create it and initialize the schema via SQLAlchemy.

---

# 🚀 Roadmap & Future Enhancements

- **Decentralized Storage (IPFS / Filecoin)**: Migrate off-chain MRV document storage from local FastAPI storage to distributed IPFS nodes.
- **ERC-1155 Multi-Token Standard**: Upgrade internal contract credit balances to standard ERC-1155 semi-fungible tokens for cross-platform DeFi composability.
- **Satellite Telemetry Oracles (Chainlink)**: Ingest automated vegetation index (NDVI) and solar irradiation data via Chainlink decentralized oracle networks.
- **Automated Market Maker (AMM)**: Introduce continuous liquidity pools for automated carbon credit swaps and dynamic pricing curves.

---

# 📜 License & Acknowledgements

Developed as a modern educational and hackathon-oriented decentralized climate technology platform.

- **Solidity Smart Contracts**: Built using [OpenZeppelin](https://openzeppelin.com/).
- **Mapping**: Powered by [Leaflet](https://leafletjs.com/) and OpenStreetMap / Esri World Imagery.
- **Icons & UI**: [Lucide React](https://lucide.dev/), [Tailwind/CSS Variables], and [Recharts](https://recharts.org/).

---

<p align="center">
  <b>Built with 🌱 Sustainability · ⛓️ Blockchain Transparency · 💻 Modern Full-Stack Engineering</b>
</p>
