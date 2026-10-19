const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper: mimics the backend's duplicate-detection service normalization,
// including project period (start/end date) as part of the hash.
function makeFingerprint(name, location, projectType, startDate, endDate) {
  const normalized = `${name.trim().toLowerCase()}|${location.trim().toLowerCase()}|${projectType.trim().toLowerCase()}|${startDate.trim()}|${endDate.trim()}`;
  return ethers.keccak256(ethers.toUtf8Bytes(normalized));
}

describe("CarbonCreditPlatform", function () {
  let contract;
  let admin, verifier1, verifier2, companyA, companyB, buyer, nonVerifier;

  beforeEach(async function () {
    [admin, verifier1, verifier2, companyA, companyB, buyer, nonVerifier] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CarbonCreditPlatform");
    contract = await Factory.deploy();
    await contract.waitForDeployment();

    const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
    // admin already has VERIFIER_ROLE from constructor
    await contract.connect(admin).grantRole(VERIFIER_ROLE, verifier1.address);
    await contract.connect(admin).grantRole(VERIFIER_ROLE, verifier2.address);
  });

  describe("Roles", function () {
    it("gives the deployer both admin and verifier roles", async function () {
      const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await contract.hasRole(VERIFIER_ROLE, admin.address)).to.be.true;
    });

    it("allows granting and checking verifier roles", async function () {
      const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
      expect(await contract.hasRole(VERIFIER_ROLE, verifier1.address)).to.be.true;
      expect(await contract.hasRole(VERIFIER_ROLE, verifier2.address)).to.be.true;
      expect(await contract.hasRole(VERIFIER_ROLE, nonVerifier.address)).to.be.false;
    });
  });

  describe("Project submission", function () {
    it("lets anyone submit a project and stores it as Pending", async function () {
      const fp = makeFingerprint("Rajasthan Solar Farm", "Rajasthan, India", "Solar", "2022-08", "2025-02");

      await expect(
        contract.connect(companyA).submitProject("Rajasthan Solar Farm", "Rajasthan, India", "Solar", 1000, fp)
      )
        .to.emit(contract, "ProjectSubmitted")
        .withArgs(1, companyA.address, fp, 1000);

      const project = await contract.getProject(1);
      expect(project.status).to.equal(0); // 0 = Pending
      expect(project.co2Tonnes).to.equal(1000);
      expect(project.submitter).to.equal(companyA.address);
      expect(project.approvalsCount).to.equal(0);
    });

    it("rejects a submission with zero CO2 tonnes", async function () {
      const fp = makeFingerprint("Bad Project", "Nowhere", "Solar", "2022-01", "2023-01");
      await expect(
        contract.connect(companyA).submitProject("Bad Project", "Nowhere", "Solar", 0, fp)
      ).to.be.revertedWith("CO2 amount must be positive");
    });

    it("BLOCKS a duplicate project (same name, location, type, AND period)", async function () {
      const fp = makeFingerprint("Gujarat Wind Farm", "Gujarat, India", "Wind", "2023-01", "2026-01");

      await contract.connect(companyA).submitProject("Gujarat Wind Farm", "Gujarat, India", "Wind", 500, fp);

      await expect(
        contract.connect(companyB).submitProject("Gujarat Wind Farm", "Gujarat, India", "Wind", 500, fp)
      ).to.be.revertedWith("Duplicate project detected");
    });

    it("treats the SAME project with a DIFFERENT period as a distinct project", async function () {
      const fpPeriod1 = makeFingerprint("Solar Farm X", "Rajasthan", "Solar", "2022-08", "2025-02");
      const fpPeriod2 = makeFingerprint("Solar Farm X", "Rajasthan", "Solar", "2025-03", "2028-01");

      expect(fpPeriod1).to.not.equal(fpPeriod2);

      await contract.connect(companyA).submitProject("Solar Farm X", "Rajasthan", "Solar", 1000, fpPeriod1);
      await expect(contract.connect(companyA).submitProject("Solar Farm X", "Rajasthan", "Solar", 1000, fpPeriod2))
        .to.not.be.reverted;
    });

    it("treats genuinely different projects as unique", async function () {
      const fp1 = makeFingerprint("Solar Farm A", "Delhi", "Solar", "2022-01", "2024-01");
      const fp2 = makeFingerprint("Solar Farm B", "Mumbai", "Solar", "2022-01", "2024-01");

      await contract.connect(companyA).submitProject("Solar Farm A", "Delhi", "Solar", 100, fp1);
      await expect(contract.connect(companyB).submitProject("Solar Farm B", "Mumbai", "Solar", 200, fp2)).to.not.be
        .reverted;
    });
  });

  describe("Two-Distinct-Verifier Gating & Multi-Sig Verification", function () {
    let fp;
    beforeEach(async function () {
      fp = makeFingerprint("Tree Plantation X", "Kerala", "TreePlantation", "2021-06", "2024-06");
      await contract.connect(companyA).submitProject("Tree Plantation X", "Kerala", "TreePlantation", 300, fp);
    });

    it("enforces that 1 approval keeps project pending and does NOT mint credits yet", async function () {
      await expect(contract.connect(verifier1).approveProject(1))
        .to.emit(contract, "ProjectPartiallyApproved")
        .withArgs(1, verifier1.address, 1);

      const project = await contract.getProject(1);
      expect(project.status).to.equal(0); // Still Pending!
      expect(project.approvalsCount).to.equal(1);

      // Credits must NOT be minted yet
      expect(await contract.getCreditBalance(1, companyA.address)).to.equal(0);
      expect(await contract.hasApproved(1, verifier1.address)).to.be.true;
    });

    it("prevents the SAME verifier from approving twice", async function () {
      await contract.connect(verifier1).approveProject(1);
      await expect(contract.connect(verifier1).approveProject(1)).to.be.revertedWith(
        "Verifier already approved this project"
      );
    });

    it("prevents the submitter from verifying their own project even if they have verifier role", async function () {
      const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
      await contract.connect(admin).grantRole(VERIFIER_ROLE, companyA.address);

      await expect(contract.connect(companyA).approveProject(1)).to.be.revertedWith(
        "Submitter cannot verify own project"
      );
    });

    it("prevents non-verifiers from approving", async function () {
      await expect(contract.connect(nonVerifier).approveProject(1)).to.be.reverted;
    });

    it("mints credits and issues provenance batch upon the 2nd distinct verifier approval", async function () {
      // 1st approval
      await contract.connect(verifier1).approveProject(1);
      expect(await contract.getCreditBalance(1, companyA.address)).to.equal(0);

      // 2nd distinct approval
      await expect(contract.connect(verifier2).approveProject(1))
        .to.emit(contract, "ProjectApproved")
        .withArgs(1, verifier2.address, 300)
        .and.to.emit(contract, "BatchIssued");

      const project = await contract.getProject(1);
      expect(project.status).to.equal(1); // 1 = Approved
      expect(project.approvalsCount).to.equal(2);

      // Credits are now minted
      expect(await contract.getCreditBalance(1, companyA.address)).to.equal(300);

      // Verify both distinct verifiers are recorded on-chain
      const verifiers = await contract.getProjectVerifiers(1);
      expect(verifiers).to.deep.equal([verifier1.address, verifier2.address]);
    });

    it("lets a verifier reject a project and frees the fingerprint for resubmission", async function () {
      await contract.connect(verifier1).rejectProject(1);
      const project = await contract.getProject(1);
      expect(project.status).to.equal(2); // 2 = Rejected

      await expect(
        contract.connect(companyA).submitProject("Tree Plantation X", "Kerala", "TreePlantation", 300, fp)
      ).to.not.be.reverted;
    });

    it("cannot approve an already approved project", async function () {
      await contract.connect(verifier1).approveProject(1);
      await contract.connect(verifier2).approveProject(1);

      await expect(contract.connect(admin).approveProject(1)).to.be.revertedWith("Project is not pending");
    });
  });

  describe("Off-Chain Document Cryptographic Commitments", function () {
    let fp;
    beforeEach(async function () {
      fp = makeFingerprint("Solar Audit Project", "Rajasthan", "Solar", "2023-01", "2025-01");
      await contract.connect(companyA).submitProject("Solar Audit Project", "Rajasthan", "Solar", 800, fp);
    });

    it("allows authorized participants to commit cryptographic document hashes on-chain", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("MRV_AUDIT_REPORT_CONTENT_V1"));

      await expect(
        contract.connect(verifier1).attachVerificationDocument(1, docHash, "MRV_AUDIT_REPORT", "/api/documents/mrv-1")
      )
        .to.emit(contract, "DocumentAttached")
        .withArgs(1, docHash, "MRV_AUDIT_REPORT", "/api/documents/mrv-1", verifier1.address);

      const docs = await contract.getProjectDocuments(1);
      expect(docs.length).to.equal(1);
      expect(docs[0].docHash).to.equal(docHash);
      expect(docs[0].docType).to.equal("MRV_AUDIT_REPORT");
      expect(docs[0].uploadedBy).to.equal(verifier1.address);
    });

    it("rejects attaching zero document hash", async function () {
      await expect(
        contract.connect(companyA).attachVerificationDocument(1, ethers.ZeroHash, "BASELINE", "/api/doc")
      ).to.be.revertedWith("Invalid document hash");
    });

    it("rejects unauthorized strangers from attaching documents", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("MALICIOUS_DOC"));
      await expect(
        contract.connect(nonVerifier).attachVerificationDocument(1, docHash, "REPORT", "/api/fake")
      ).to.be.revertedWith("Not authorized to attach document");
    });
  });

  describe("Credit Batch Provenance & Lifecycle", function () {
    beforeEach(async function () {
      const fp = makeFingerprint("Sundarbans Mangrove", "West Bengal", "TreePlantation", "2022-01", "2025-01");
      await contract.connect(companyA).submitProject("Sundarbans Mangrove", "West Bengal", "TreePlantation", 1200, fp);
      await contract.connect(verifier1).approveProject(1);
      await contract.connect(verifier2).approveProject(1);
    });

    it("creates an on-chain credit batch with full initial supply", async function () {
      const batchIds = await contract.getProjectBatches(1);
      expect(batchIds.length).to.equal(1);

      const batch = await contract.getCreditBatch(batchIds[0]);
      expect(batch.batchId).to.equal(1);
      expect(batch.projectId).to.equal(1);
      expect(batch.totalSupply).to.equal(1200);
      expect(batch.activeSupply).to.equal(1200);
      expect(batch.retiredSupply).to.equal(0);
      expect(batch.vintage).to.equal("BATCH-1");
    });

    it("updates batch active and retired supplies upon credit retirement", async function () {
      await contract.connect(companyA).retireCredits(1, 400);

      const batch = await contract.getCreditBatch(1);
      expect(batch.activeSupply).to.equal(800);
      expect(batch.retiredSupply).to.equal(400);
    });
  });

  describe("Retirement Records & Certificates", function () {
    beforeEach(async function () {
      const fp = makeFingerprint("Himalayan Forest Offset", "Uttarakhand", "TreePlantation", "2021-01", "2024-01");
      await contract.connect(companyA).submitProject("Himalayan Forest Offset", "Uttarakhand", "TreePlantation", 1000, fp);
      await contract.connect(verifier1).approveProject(1);
      await contract.connect(verifier2).approveProject(1);
    });

    it("issues a certificate with detailed beneficiary and retirement reason", async function () {
      await expect(
        contract.connect(companyA).retireCreditsWithDetails(1, 250, "Acme Corp Scope 1", "Annual Sustainability Target")
      )
        .to.emit(contract, "CertificateIssued")
        .withArgs(1, 1, companyA.address, 250, "Acme Corp Scope 1", "Annual Sustainability Target")
        .and.to.emit(contract, "CreditsRetired")
        .withArgs(1, companyA.address, 250);

      const cert = await contract.getRetirementRecord(1);
      expect(cert.certificateId).to.equal(1);
      expect(cert.projectId).to.equal(1);
      expect(cert.retiree).to.equal(companyA.address);
      expect(cert.beneficiary).to.equal("Acme Corp Scope 1");
      expect(cert.retirementReason).to.equal("Annual Sustainability Target");
      expect(cert.amount).to.equal(250);

      const projectCertIds = await contract.getProjectRetirements(1);
      expect(projectCertIds.length).to.equal(1);
      expect(projectCertIds[0]).to.equal(1);

      const retireeCertIds = await contract.getRetireeRetirements(companyA.address);
      expect(retireeCertIds.length).to.equal(1);
      expect(retireeCertIds[0]).to.equal(1);
    });

    it("prevents retiring more credits than owned", async function () {
      await expect(
        contract.connect(companyA).retireCreditsWithDetails(1, 5000, "Acme Corp", "Test")
      ).to.be.revertedWith("Insufficient credit balance");
    });
  });

  describe("Trading and retirement", function () {
    beforeEach(async function () {
      const fp = makeFingerprint("Biogas Plant Y", "Punjab", "Biogas", "2020-01", "2023-01");
      await contract.connect(companyA).submitProject("Biogas Plant Y", "Punjab", "Biogas", 1000, fp);
      await contract.connect(verifier1).approveProject(1);
      await contract.connect(verifier2).approveProject(1);
      // companyA now holds 1000 credits for project 1
    });

    it("allows the credit holder to transfer credits to a buyer", async function () {
      await expect(contract.connect(companyA).transferCredits(1, buyer.address, 400))
        .to.emit(contract, "CreditsTransferred")
        .withArgs(1, companyA.address, buyer.address, 400);

      expect(await contract.getCreditBalance(1, companyA.address)).to.equal(600);
      expect(await contract.getCreditBalance(1, buyer.address)).to.equal(400);
    });

    it("prevents transferring more credits than owned", async function () {
      await expect(contract.connect(companyA).transferCredits(1, buyer.address, 5000)).to.be.revertedWith(
        "Insufficient credit balance"
      );
    });

    it("allows retiring credits permanently", async function () {
      await expect(contract.connect(companyA).retireCredits(1, 200))
        .to.emit(contract, "CreditsRetired")
        .withArgs(1, companyA.address, 200);

      expect(await contract.getCreditBalance(1, companyA.address)).to.equal(800);
      expect(await contract.totalRetired(1)).to.equal(200);
    });

    it("prevents retiring more credits than owned", async function () {
      await expect(contract.connect(companyA).retireCredits(1, 5000)).to.be.revertedWith(
        "Insufficient credit balance"
      );
    });
  });

  describe("Marketplace", function () {
    beforeEach(async function () {
      const fp = makeFingerprint("Marketplace Test Farm", "Punjab", "Solar", "2021-01", "2024-01");
      await contract.connect(companyA).submitProject("Marketplace Test Farm", "Punjab", "Solar", 1000, fp);
      await contract.connect(verifier1).approveProject(1);
      await contract.connect(verifier2).approveProject(1);
      // companyA holds 1000 credits for project 1
    });

    it("lets a credit holder create a listing and escrows the credits", async function () {
      const price = ethers.parseEther("0.01"); // 0.01 ETH per credit

      await expect(contract.connect(companyA).createListing(1, 300, price))
        .to.emit(contract, "ListingCreated")
        .withArgs(1, 1, companyA.address, 300, price);

      // 300 credits moved out of companyA's spendable balance into escrow
      expect(await contract.getCreditBalance(1, companyA.address)).to.equal(700);

      const listing = await contract.getListing(1);
      expect(listing.amount).to.equal(300);
      expect(listing.seller).to.equal(companyA.address);
      expect(listing.active).to.be.true;
    });

    it("prevents listing more credits than owned", async function () {
      const price = ethers.parseEther("0.01");
      await expect(contract.connect(companyA).createListing(1, 5000, price)).to.be.revertedWith(
        "Insufficient credit balance"
      );
    });

    it("lets the seller cancel a listing and returns escrowed credits", async function () {
      const price = ethers.parseEther("0.01");
      await contract.connect(companyA).createListing(1, 300, price);

      await expect(contract.connect(companyA).cancelListing(1)).to.emit(contract, "ListingCancelled").withArgs(1);

      expect(await contract.getCreditBalance(1, companyA.address)).to.equal(1000); // fully refunded
      const listing = await contract.getListing(1);
      expect(listing.active).to.be.false;
    });

    it("prevents a non-seller from cancelling a listing", async function () {
      const price = ethers.parseEther("0.01");
      await contract.connect(companyA).createListing(1, 300, price);
      await expect(contract.connect(buyer).cancelListing(1)).to.be.revertedWith("Not the seller");
    });

    it("lets a buyer purchase the full listing amount, paying ETH to the seller", async function () {
      const price = ethers.parseEther("0.01");
      await contract.connect(companyA).createListing(1, 300, price);

      const totalPrice = price * 300n;
      const sellerBalanceBefore = await ethers.provider.getBalance(companyA.address);

      await expect(contract.connect(buyer).buyListing(1, 300, { value: totalPrice }))
        .to.emit(contract, "ListingSold")
        .withArgs(1, buyer.address, 300, totalPrice, 0);

      expect(await contract.getCreditBalance(1, buyer.address)).to.equal(300);

      const sellerBalanceAfter = await ethers.provider.getBalance(companyA.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(totalPrice);

      const listing = await contract.getListing(1);
      expect(listing.active).to.be.false; // fully sold out
    });

    it("supports partial fills, keeping the listing active with a reduced amount", async function () {
      const price = ethers.parseEther("0.01");
      await contract.connect(companyA).createListing(1, 300, price);

      await contract.connect(buyer).buyListing(1, 100, { value: price * 100n });

      const listing = await contract.getListing(1);
      expect(listing.active).to.be.true;
      expect(listing.amount).to.equal(200);
      expect(await contract.getCreditBalance(1, buyer.address)).to.equal(100);
    });

    it("rejects a purchase with incorrect ETH sent", async function () {
      const price = ethers.parseEther("0.01");
      await contract.connect(companyA).createListing(1, 300, price);

      await expect(
        contract.connect(buyer).buyListing(1, 300, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Incorrect ETH sent");
    });

    it("rejects buying more than the listing's remaining amount", async function () {
      const price = ethers.parseEther("0.01");
      await contract.connect(companyA).createListing(1, 300, price);

      await expect(
        contract.connect(buyer).buyListing(1, 1000, { value: price * 1000n })
      ).to.be.revertedWith("Invalid amount");
    });

    it("rejects buying from a cancelled listing", async function () {
      const price = ethers.parseEther("0.01");
      await contract.connect(companyA).createListing(1, 300, price);
      await contract.connect(companyA).cancelListing(1);

      await expect(
        contract.connect(buyer).buyListing(1, 100, { value: price * 100n })
      ).to.be.revertedWith("Listing not active");
    });
  });
});
