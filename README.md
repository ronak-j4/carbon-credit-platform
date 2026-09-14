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

```text
Project Name
+
Location
+
Project Type
+
Start Date
+
End Date
