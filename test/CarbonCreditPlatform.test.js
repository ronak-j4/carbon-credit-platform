const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper: this mimics what the backend's duplicate-detection service will
// do — normalize the identifying fields and hash them the same way the
// contract expects. Keeping the SAME normalization here and in the backend
// is critical, otherwise two "identical" projects could hash differently.
function makeFingerprint(name, location, projectType) {
  const normalized = `${name.trim().toLowerCase()}|${location.trim().toLowerCase()}|${projectType.trim().toLowerCase()}`;
  return ethers.keccak256(ethers.toUtf8Bytes(normalized));
}

describe("CarbonCreditPlatform", function () {
  let contract;
  let admin, verifier, companyA, companyB, buyer;

  // This runs before EVERY test, giving each test a fresh contract
  // deployment so tests can't accidentally affect each other.
  beforeEach(async function () {
    [admin, verifier, companyA, companyB, buyer] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CarbonCreditPlatform");
    contract = await Factory.deploy();
    await contract.waitForDeployment();

    // Admin grants the VERIFIER_ROLE to a separate verifier account,
    // simulating a real deployment where verification bodies are added
    // after launch.
    const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
    await contract.connect(admin).grantRole(VERIFIER_ROLE, verifier.address);
  });

  describe("Roles", function () {
    it("gives the deployer both admin and verifier roles", async function () {
      const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await contract.hasRole(VERIFIER_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Project submission", function () {
    it("lets anyone submit a project and stores it as Pending", async function () {
      const fp = makeFingerprint("Rajasthan Solar Farm", "Rajasthan, India", "Solar");

      await expect(
        contract.connect(companyA).submitProject("Rajasthan Solar Farm", "Rajasthan, India", "Solar", 1000, fp)
      )
        .to.emit(contract, "ProjectSubmitted")
        .withArgs(1, companyA.address, fp, 1000);

      const project = await contract.getProject(1);
      expect(project.status).to.equal(0); // 0 = Pending
      expect(project.co2Tonnes).to.equal(1000);
      expect(project.submitter).to.equal(companyA.address);
    });

    it("rejects a submission with zero CO2 tonnes", async function () {
      const fp = makeFingerprint("Bad Project", "Nowhere", "Solar");
      await expect(
        contract.connect(companyA).submitProject("Bad Project", "Nowhere", "Solar", 0, fp)
      ).to.be.revertedWith("CO2 amount must be positive");
    });

    it("BLOCKS a duplicate project — the core feature of this platform", async function () {
      const fp = makeFingerprint("Gujarat Wind Farm", "Gujarat, India", "Wind");

      // First submission succeeds
      await contract.connect(companyA).submitProject("Gujarat Wind Farm", "Gujarat, India", "Wind", 500, fp);

      // Second submission of the SAME project (even by a different
      // company, simulating registration in a different registry) must fail
      await expect(
        contract.connect(companyB).submitProject("Gujarat Wind Farm", "Gujarat, India", "Wind", 500, fp)
      ).to.be.revertedWith("Duplicate project detected");
    });

    it("treats genuinely different projects as unique", async function () {
      const fp1 = makeFingerprint("Solar Farm A", "Delhi", "Solar");
      const fp2 = makeFingerprint("Solar Farm B", "Mumbai", "Solar");

      await contract.connect(companyA).submitProject("Solar Farm A", "Delhi", "Solar", 100, fp1);
      await expect(contract.connect(companyB).submitProject("Solar Farm B", "Mumbai", "Solar", 200, fp2)).to.not.be
        .reverted;
    });
  });

  describe("Verification (approve/reject)", function () {
    let fp;
    beforeEach(async function () {
      fp = makeFingerprint("Tree Plantation X", "Kerala", "TreePlantation");
      await contract.connect(companyA).submitProject("Tree Plantation X", "Kerala", "TreePlantation", 300, fp);
    });

    it("lets a verifier approve a project and mints credits to the submitter", async function () {
      await expect(contract.connect(verifier).approveProject(1))
        .to.emit(contract, "ProjectApproved")
        .withArgs(1, verifier.address, 300);

      const project = await contract.getProject(1);
      expect(project.status).to.equal(1); // 1 = Approved

      const balance = await contract.getCreditBalance(1, companyA.address);
      expect(balance).to.equal(300);
    });

    it("prevents a non-verifier from approving", async function () {
      await expect(contract.connect(companyB).approveProject(1)).to.be.reverted;
    });

    it("lets a verifier reject a project and frees the fingerprint for resubmission", async function () {
      await contract.connect(verifier).rejectProject(1);
      const project = await contract.getProject(1);
      expect(project.status).to.equal(2); // 2 = Rejected

      // Same fingerprint can now be resubmitted (e.g. after fixing documentation)
      await expect(
        contract.connect(companyA).submitProject("Tree Plantation X", "Kerala", "TreePlantation", 300, fp)
      ).to.not.be.reverted;
    });

    it("cannot approve the same project twice", async function () {
      await contract.connect(verifier).approveProject(1);
      await expect(contract.connect(verifier).approveProject(1)).to.be.revertedWith("Project is not pending");
    });
  });

  describe("Trading and retirement", function () {
    beforeEach(async function () {
      const fp = makeFingerprint("Biogas Plant Y", "Punjab", "Biogas");
      await contract.connect(companyA).submitProject("Biogas Plant Y", "Punjab", "Biogas", 1000, fp);
      await contract.connect(verifier).approveProject(1);
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
});
