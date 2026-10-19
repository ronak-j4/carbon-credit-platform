# 🌱 CarbonChain

### Decentralized Blockchain Carbon Credit Registry, Two-Verifier Multi-Sig Verification, GIS Polygon Geofencing & Trustless Audit Explorer

> **CarbonChain** is a full-stack, enterprise-grade decentralized carbon credit management platform. It brings together **interactive GIS polygon geofencing, two-distinct-verifier approval gating enforced in Solidity, cryptographic document commitments, credit batch provenance tracking, permanent QR-verifiable retirement certificates, a peer-to-peer carbon marketplace, and a public trustless audit explorer**—powered by **Ethereum Smart Contracts, FastAPI, React/Vite, Leaflet, and SQLite**.

---

<p align="center">
  <img src="https://img.shields.io/badge/Blockchain-Ethereum%20Compatible-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white" alt="Blockchain">
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity">
  <img src="https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/GIS%20Mapping-Leaflet%20%26%20Shapely-16A34A?style=for-the-badge" alt="GIS">
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/Smart%20Contracts-OpenZeppelin-4E5EE4?style=for-the-badge" alt="OpenZeppelin">
</p>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features (Phase 1 & Phase 2)](#-key-features)
- [Complete Carbon Credit Lifecycle](#-complete-carbon-credit-lifecycle)
- [GIS Polygon Geofencing & Overlap Detection](#-gis-polygon-geofencing--overlap-detection)
- [Two-Distinct-Verifier Approval Gating (Solidity Enforced)](#-two-distinct-verifier-approval-gating-solidity-enforced)
- [Credit Batch Provenance & Supply Lifecycle](#-credit-batch-provenance--supply-lifecycle)
- [Cryptographic Document Commitments on Blockchain](#-cryptographic-document-commitments-on-blockchain)
- [QR-Verifiable Retirement Records & Certificates](#-qr-verifiable-retirement-records--certificates)
- [Public Trustless Audit Explorer](#-public-trustless-audit-explorer)
- [Marketplace & P2P Trading](#-marketplace--p2p-trading)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Smart Contract Specification](#-smart-contract-specification)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)
- [MetaMask & Test Accounts Configuration](#-metamask--test-accounts-configuration)
- [Automated Test Suite (34 Tests Passing)](#-automated-test-suite)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

# 🌍 Overview

Traditional voluntary and compliance carbon credit systems suffer from systemic integrity challenges:
- **Double Counting & Overlapping Claims**: The same physical land area is registered under multiple registries or different project IDs.
- **Single-Authority Fraud**: A single corrupt admin or centralized database account can mint arbitrary carbon credits without multi-party oversight.
- **Phantom Offsets & Broken Provenance**: Credits lack transparent lineage back to original project batches, vintage years, and baseline MRV documents.
- **Unverifiable Retirements**: Offset claims are represented by static PDF receipts that cannot be cryptographically verified against on-chain records.

**CarbonChain** directly resolves these challenges by using the **blockchain as an immutable, authoritative state machine** combined with **geospatial GIS validation** and **multi-signature verifier consensus**.

---

# ✨ Key Features

### 🗺️ 1. Interactive GIS Polygon Geofencing & Satellite Mapping
- **Interactive Boundary Drawing**: Draw project perimeters directly on high-resolution satellite imagery (Esri World Imagery + OpenStreetMap base layers).
- **Dynamic Vertex Manipulation**: Drag vertices, delete points, or **pull midpoint handles** to transform shapes (e.g. triangle into quadrilateral or complex polygon).
- **Geospatial Overlap Detection Engine**: Python Shapely calculates exact polygonal intersections and area overlaps ($km^2$) against all active projects, blocking duplicate spatial claims.
- **Interactive GIS Modal**: Inspect polygon boundaries, vertex counts, and center coordinates directly across Project Cards, Marketplace, Explorer, and Submission receipts.

### 🛡️ 2. Two-Distinct-Verifier Gating (Solidity Multi-Sig)
- **Multi-Sig Consensus**: Solidity strictly mandates approvals from **2 distinct authorized verifiers** (`REQUIRED_VERIFIERS = 2`) before a single credit can be minted.
- **No Self-Verification**: The smart contract prevents project submitters from verifying their own projects (`SubmitterCannotVerifyOwnProject`), even if they hold the `VERIFIER_ROLE`.
- **Duplicate Approval Prevention**: Solidity blocks the same verifier from signing twice (`AlreadyApprovedByVerifier`).
- **Progressive State**: Moves from `Pending` (0/2) ➔ `ProjectPartiallyApproved` (1/2) ➔ `Approved` (2/2) with automated batch issuance.

### 📦 3. Credit Batch Provenance & Lifecycle Tracking
- **Immutable Batch Structs**: On approval, credits are minted into dedicated batches (`CreditBatch`) with an assigned batch ID, project ID, vintage year, and initial supply.
- **Real-Time Supply Tracking**: Each batch tracks active vs. permanently retired supply.
- **Card & Explorer Provenance Drawers**: Detailed tables display batch history, vintage references, and active/retired balances.

### 📄 4. Off-Chain Documents with Cryptographic On-Chain Commitments
- **Keccak-256 Hashing**: MRV audit reports, satellite analysis, and baseline documents are hashed off-chain.
- **On-Chain Anchoring**: The cryptographic hash is permanently committed to the smart contract (`attachVerificationDocument`).
- **Cryptographic Integrity Verification**: Built-in verification compares downloaded files against the on-chain hash to prove zero tampering.

### 📜 5. Permanent QR-Verifiable Retirement Certificates & PDF Download
- **Permanent On-Chain Records**: Retirement is irreversible on-chain, storing retiree address, beneficiary name, offset purpose, amount, and timestamp.
- **Dynamic QR Code**: Scannable QR codes immediately resolve to the public audit explorer verification URL.
- **High-Fidelity PDF Certificates**: Generate and download professional retirement certificates complete with cryptographic hashes, block numbers, and verification seals.

### 🔍 6. Public Trustless Audit Explorer
- **Zero-Wallet Required**: Anyone can audit registered projects, multi-sig signers, credit batches, and retirement records without connecting MetaMask.
- **Unified Multi-Entity Search**: Search by numeric Project ID (`#1`), Certificate ID (`#CERT-1`), or Wallet address (`0x...`).
- **Wallet Portfolio Audit**: Inspect all active project token balances and retirement histories for any wallet address.

### 🏪 7. Carbon Credit Marketplace
- **Fixed-Price Escrow Trading**: List carbon credits with automated contract escrow in native ETH.
- **Partial Fills**: Purchase exact required tonnes; listings update remaining amounts automatically.
- **Instant Ownership Transfer**: Credits move immediately to buyer wallets upon confirmed transaction.

### 🎨 8. Clean Modern UI with Light / Dark Theme & Realistic Photography
- **Theme Toggle**: Switch between Light Mode and Dark Mode with persistent preferences.
- **Realistic Imagery**: Category allocation featuring realistic photography for Solar, Wind, Forest, Regenerative Farm, Mangrove Blue Carbon, and Biogas.
- **Carbon Allocation Progress Bars**: Dynamic utilization bars reflecting real-time active, retired, and wallet balances.

---

# 🔄 Complete Carbon Credit Lifecycle

```text
       ┌────────────────────────────────────────────────────────┐
       │ 1. PROJECT SUBMISSION & GIS GEOFENCING                 │
       │    • Submitter draws GIS boundary polygon              │
       │    • Shapely checks spatial overlap with active claims │
       │    • Keccak-256 fingerprint generated & checked        │
       │    • Project created on-chain in "Pending" state       │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │ 2. TWO-DISTINCT-VERIFIER MULTI-SIG APPROVAL            │
       │    • Verifier 1 approves -> ProjectPartiallyApproved   │
       │    • Verifier 2 approves -> Approved & Batch Issued    │
       │    • Submitters blocked from self-approving            │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │ 3. PROVENANCE BATCH ISSUANCE                           │
       │    • CreditBatch created on-chain with vintage         │
       │    • Credits minted to project submitter's wallet      │
       │    • Verification audit documents anchored on-chain    │
       └───────────────────────────┬────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
       ┌────────────────────────┐    ┌─────────────────────────┐
       │ 4A. MARKETPLACE ESCROW │    │ 4B. PEER-TO-PEER SEND   │
       │     • Fixed-price ETH  │    │     • Direct transfer   │
       │     • Partial fills    │    │       between wallets   │
       └────────────┬───────────┘    └────────────┬────────────┘
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │ 5. IRREVERSIBLE ON-CHAIN RETIREMENT                    │
       │    • Permanent burning of credits from wallet balance  │
       │    • Batch retiredSupply incremented                   │
       │    • RetirementRecord created on-chain                 │
       │    • QR-verifiable certificate & PDF generated         │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │ 6. PUBLIC TRUSTLESS AUDIT                              │
       │    • Inspect project provenance in Audit Explorer      │
       │    • Verify retirement validity via scanned QR code    │
       │    • Audit wallet portfolio on-chain                   │
       └────────────────────────────────────────────────────────┘
```

---

# 🗺️ GIS Polygon Geofencing & Overlap Detection

To eliminate duplicate environmental claims over identical tracts of land, CarbonChain integrates GIS boundary verification:

1. **Leaflet Geofencing Canvas**: Submitters draw geospatial polygons directly over high-resolution satellite tiles.
2. **Vertex Manipulation**:
   - Drag boundary vertices to adjust shape.
   - Click midpoints along any line to insert vertices (transforming triangles into complex polygons).
   - Delete individual vertices or clear boundaries.
3. **Automated Overlap Detection**:
   The FastAPI backend uses `shapely.geometry.Polygon` to perform geometric intersection analysis:
   ```python
   # Intersection area calculation
   intersection = polygon_a.intersection(polygon_b)
   overlap_area_km2 = calculate_geodesic_area(intersection)
   overlap_percent = (intersection.area / polygon_a.area) * 100.0
   ```
   If overlap exceeds the threshold ($1\%$ or $0.001\text{ km}^2$), the submission is blocked with an explicit overlap report indicating the conflicting project.

---

# 🛡️ Two-Distinct-Verifier Approval Gating (Solidity Enforced)

Unlike systems where a single admin can mint credits, CarbonChain implements smart-contract-enforced multi-signature verification:

```solidity
function approveProject(uint256 projectId) external onlyRole(VERIFIER_ROLE) {
    Project storage proj = projects[projectId];
    require(proj.status == ProjectStatus.Pending, "Project not pending");
    require(proj.submitter != msg.sender, "Submitters cannot verify own projects");
    require(!hasApproved[projectId][msg.sender], "Already approved by verifier");

    hasApproved[projectId][msg.sender] = true;
    projectVerifiers[projectId].push(msg.sender);

    if (projectVerifiers[projectId].length == 1) {
        emit ProjectPartiallyApproved(projectId, msg.sender, 1);
    } else if (projectVerifiers[projectId].length >= REQUIRED_VERIFIERS) {
        proj.status = ProjectStatus.Approved;
        _issueBatch(projectId, proj.co2Tonnes, "2026");
        creditBalance[projectId][proj.submitter] += proj.co2Tonnes;
        emit ProjectApproved(projectId, msg.sender, proj.co2Tonnes);
    }
}
```

- **Enforced Distinct Signers**: 1st verifier signs ➔ recorded on-chain, project stays pending. 2nd distinct verifier signs ➔ credits minted.
- **Self-Approval Guard**: Throws `Submitters cannot verify own projects` if `proj.submitter == msg.sender`.
- **Double Approval Guard**: Throws `Already approved by verifier` if the same verifier attempts to sign twice.

---

# 📦 Credit Batch Provenance & Supply Lifecycle

Every credit issuance on CarbonChain is permanently tied to an on-chain provenance batch:

```solidity
struct CreditBatch {
    uint256 batchId;
    uint256 projectId;
    uint256 totalSupply;
    uint256 activeSupply;
    uint256 retiredSupply;
    uint256 mintedAt;
    string vintage;
}
```

- **Active vs. Retired Supply**: When credits are retired, `activeSupply` is decremented and `retiredSupply` is incremented.
- **Audit Lineage**: Every batch is queried directly via `contract.getCreditBatch(batchId)` and displayed in provenance drawers.

---

# 📄 Cryptographic Document Commitments on Blockchain

Large MRV (Measurement, Reporting, and Verification) reports, drone scans, and baseline audits are stored off-chain with Keccak-256 cryptographic commitments anchored to the smart contract:

1. File is uploaded to `/api/projects/{id}/documents/upload`.
2. Backend computes the Keccak-256 hash:
   $$\text{hash} = \text{keccak256}(\text{file content})$$
3. Hash and URI are committed on-chain via `contract.attachVerificationDocument(...)`.
4. Anyone can verify document integrity via `/api/projects/{id}/documents/verify` to confirm that the off-chain file has not been altered by even a single byte.

---

# 📜 QR-Verifiable Retirement Records & Certificates

When carbon credits are consumed to claim an environmental offset, they must be permanently and irreversibly retired:

```solidity
function retireCreditsWithDetails(
    uint256 projectId,
    uint256 amount,
    string calldata beneficiary,
    string calldata retirementReason
) external returns (uint256 certificateId);
```

- **On-Chain Certificate Registry**: Mints an immutable `RetirementRecord` with an incrementing certificate ID.
- **Dynamic QR Code**: Generates a QR code linking directly to `/explorer?type=certificate&id=<cert_id>`.
- **PDF Certificate**: Users can click **Download Official PDF Certificate** to export a cryptographic document formatted with:
  - Official Certificate ID (`#CERT-X`)
  - Beneficiary name and corporate offset justification
  - Project name, location, and project type
  - Retired tonnage in tonnes of $\text{CO}_2$
  - Timestamp and retiree wallet address
  - Embedded verification QR code and cryptographic watermark

---

# 🔍 Public Trustless Audit Explorer

Available at `/explorer`, the public audit explorer gives external stakeholders, regulators, and buyers direct access to on-chain state without requiring a Web3 wallet connection:

- **Project Tab**: Inspect approval threshold ($2/2$), verifier wallet addresses, Keccak-256 fingerprint, GIS coordinates, committed documents, and credit batches.
- **Certificate Tab**: Enter any Certificate ID (`1`, `CERT-1`) to verify retirement legitimacy, beneficiary details, and scan the on-chain QR code.
- **Wallet Tab**: Inspect all project balances and retirement histories for any wallet address.

---

# 🏗️ System Architecture

```text
                     ┌──────────────────────────────────────────────┐
                     │              CLIENT BROWSER                  │
                     │  React 18 + Vite + ethers.js v6 + Leaflet    │
                     └───────────────┬──────────────┬───────────────┘
                                     │              │
                   REST APIs (HTTP)  │              │  JSON-RPC (Port 8545)
                                     ▼              ▼
                     ┌───────────────────────┐  ┌───────────────────┐
                     │    FastAPI BACKEND    │  │   HARDHAT NODE    │
                     │  • Geospatial GIS     │  │  Solidity 0.8.24  │
                     │  • Overlap Detection  │  │  CarbonCredit     │
                     │  • Document Hasher    │  │  Platform Contract│
                     └───────────┬───────────┘  └───────────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │    SQLite DATABASE    │
                     │  • Project Metadata   │
                     │  • GeoJSON Polygons   │
                     │  • Document Store     │
                     └───────────────────────┘
```

---

# 🧰 Technology Stack

| Domain | Technologies |
|---|---|
| **Smart Contracts** | Solidity `0.8.24`, OpenZeppelin `AccessControl`, Hardhat |
| **Blockchain Testing** | Hardhat, Chai, Mocha, ethers.js v6 |
| **Frontend** | React 18, Vite, ethers.js v6, Leaflet, Lucide Icons, html2canvas, jsPDF |
| **Backend API** | Python 3.11+, FastAPI, Web3.py, Pydantic v2, Uvicorn |
| **GIS & Geospatial** | Shapely, GeoJSON, OpenStreetMap, Esri World Imagery |
| **Database & ORM** | SQLite, SQLAlchemy |
| **Wallet Interaction** | MetaMask (EIP-1193), Hardhat Localhost |

---

# 📜 Smart Contract Specification

The authoritative smart contract is [`CarbonCreditPlatform.sol`](file:///c:/Users/Ronak%20Jain/OneDrive/Desktop/Project/carbon-credit-platform/contracts/CarbonCreditPlatform.sol).

### Key Storage Structures
- `projects`: Mapping of project ID to `Project` struct (`id`, `submitter`, `name`, `location`, `projectType`, `co2Tonnes`, `fingerprint`, `status`, `submittedAt`).
- `hasApproved`: Double-mapping `mapping(uint256 => mapping(address => bool))` tracking verifier approvals per project.
- `projectVerifiers`: Mapping of project ID to array of verifier addresses.
- `creditBatches`: Mapping of batch ID to `CreditBatch` struct.
- `retirementRecords`: Mapping of certificate ID to `RetirementRecord` struct.
- `creditBalance`: Mapping of project ID and wallet address to active balance.
- `listings`: Carbon credit marketplace listings escrowing credits.

### Primary Functions
- `submitProject(...)`: Registers project with cryptographic fingerprint.
- `approveProject(uint256 projectId)`: Verifier approval step; automatically triggers issuance on 2nd distinct approval.
- `rejectProject(uint256 projectId)`: Verifier rejection; frees fingerprint.
- `attachVerificationDocument(...)`: Anchors Keccak-256 document hash on-chain.
- `transferCredits(...)`: Peer-to-peer transfer of credits between wallets.
- `retireCreditsWithDetails(...)`: Permanently burns credits and issues certificate.
- `createListing(...)` / `buyListing(...)` / `cancelListing(...)`: Marketplace operations.

---

# 🔌 API Endpoints Reference

The FastAPI backend runs on `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`:

### Projects & GIS
- `POST /api/projects/record`: Record project metadata, center point, and GeoJSON polygon boundary.
- `GET /api/projects`: List all projects with approval status, coordinates, and metadata.
- `GET /api/projects/{project_id}`: Fetch detailed project record with verifiers, batches, and documents.
- `POST /api/projects/check-duplicate`: Run duplicate fingerprint and geospatial overlap checks.

### Documents & Provenance
- `POST /api/projects/{project_id}/documents/upload`: Upload audit PDF/document; returns Keccak-256 hash.
- `GET /api/projects/{project_id}/documents/{doc_hash}`: Download verification document.
- `POST /api/projects/{project_id}/documents/verify`: Cryptographically verify local document against on-chain hash.

### Certificates & Retirements
- `GET /api/certificates/{certificate_id}`: Fetch authoritative on-chain retirement record and verification details.
- `GET /api/projects/{project_id}/retirements`: List all retirements for a project.

---

# 📁 Project Directory Structure

```text
carbon-credit-platform/
├── contracts/
│   └── CarbonCreditPlatform.sol      # Solidity smart contract (Two-verifier gating, batches, retirements)
├── scripts/
│   └── deploy.js                      # Deployment script for Hardhat network
├── test/
│   └── CarbonCreditPlatform.test.js   # 34 automated Hardhat tests
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI application entry point
│   │   ├── blockchain.py              # Web3.py contract client and demo signers
│   │   ├── duplicate_detection.py     # Shapely GIS overlap & fingerprint detection
│   │   ├── models.py                  # SQLAlchemy metadata and document models
│   │   ├── schemas.py                 # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   └── projects.py            # API routes (projects, GIS, documents, certificates)
│   │   └── contract_abi.json          # Compiled contract ABI
│   ├── requirements.txt               # Python backend dependencies
│   └── carbon_credits.db              # SQLite development database
├── frontend/
│   ├── public/
│   │   ├── images/projects/           # Realistic imagery (solar.jpg, wind, farm, forest, etc.)
│   │   └── icons/                     # Project category icons
│   ├── src/
│   │   ├── components/
│   │   │   ├── ErrorBoundary.jsx      # React error boundary with stack trace display
│   │   │   ├── ProjectCard.jsx        # Project card with allocation bar & multi-sig proofs
│   │   │   ├── ProjectLocationModal.jsx # Interactive Leaflet GIS viewer modal
│   │   │   ├── ProjectMapBoundary.jsx # GIS polygon drawing & vertex editor component
│   │   │   └── Sidebar.jsx            # Responsive navigation & Light/Dark theme toggle
│   │   ├── pages/
│   │   │   ├── ProjectsList.jsx       # Registry page with status filters & search
│   │   │   ├── SubmitProject.jsx      # Project submission with GIS map drawing canvas
│   │   │   ├── Marketplace.jsx        # Carbon credit marketplace & buy flow
│   │   │   ├── Explorer.jsx           # Public Trustless Audit Explorer
│   │   │   └── Dashboard.jsx          # Analytics & cumulative metrics
│   │   ├── utils/
│   │   │   ├── certificate.js         # QR code generator & PDF certificate generator
│   │   │   └── projectImages.js       # Real-world project imagery allocation
│   │   └── contract/
│   │       ├── config.js              # Contract address and network configuration
│   │       └── CarbonCreditPlatform.abi.json
│   ├── package.json
│   └── vite.config.js
├── hardhat.config.js                  # Hardhat configuration (Solidity 0.8.24)
└── README.md
```

---

# 🚀 Quick Start Guide

Run the complete platform locally across 4 terminals:

### Terminal 1: Local Blockchain
```bash
npx hardhat node
```
*Starts local Ethereum JSON-RPC at `http://127.0.0.1:8545` (Chain ID `31337`).*

### Terminal 2: Deploy Smart Contract
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*Compiles contract and deploys to local node. Account #0 is automatically granted Admin and Verifier roles.*

### Terminal 3: FastAPI Backend
```bash
cd backend
# Activate your Python virtual environment (Windows: .\venv\Scripts\activate | Unix: source venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload
```
*Backend runs at `http://127.0.0.1:8000` (Swagger docs at `/docs`).*

### Terminal 4: React/Vite Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

---

# 🦊 MetaMask & Test Accounts Configuration

Connect MetaMask to the **Hardhat Local** network:
- **Network Name**: Hardhat Localhost
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency Symbol**: `ETH`

### Pre-Configured Test Accounts

| Role | Alias | Public Address | Private Key |
|---|---|---|---|
| **Deployer / Admin #1** | `admin` | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Project Developer** | `companyA` | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Admin #2 / Verifier #2** | `verifier2` | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` |
| **Buyer** | `buyer` | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

> **Testing Two-Verifier Multi-Sig**:
> 1. Submit a project using **Company A**.
> 2. Switch MetaMask to **Admin #1** and click **Approve as Verifier (Step 1/2)**. Project moves to *Awaiting 2nd Verifier*.
> 3. Switch MetaMask to **Admin #2 / Verifier #2** and click **Approve as Verifier (Step 2/2)**. Project becomes *Approved*, credits are minted, and provenance batch is issued.

---

# 🧪 Automated Test Suite

Run the full smart contract test suite covering authorization, gating, duplicate detection, batch lifecycles, and marketplace rules:

```bash
npx hardhat test
```

### Test Coverage Summary (34/34 Passing)
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

---

# 🐛 Troubleshooting

### 1. MetaMask "Nonce too high" or transaction pending forever
When restarting `npx hardhat node`, the local blockchain resets its block number to 0. Reset MetaMask's account activity:
- MetaMask ➔ Settings ➔ Advanced ➔ **Clear activity tab data**.

### 2. "Submitters cannot verify own projects" error
You cannot approve a project from the same wallet address that submitted it. Switch to **Admin #1** or **Verifier #2** in MetaMask before clicking Approve.

### 3. Backend shows "Connection refused" on port 8545
Ensure `npx hardhat node` is running in Terminal 1 before launching the backend or submitting transactions.

---

# 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<p align="center">
  <strong>🌱 CarbonChain — Transparent, Verifiable & Trustless Carbon Offsetting Powered by Blockchain & GIS</strong>
</p>
