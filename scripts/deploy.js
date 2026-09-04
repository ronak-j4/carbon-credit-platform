const hre = require("hardhat");

async function main() {
  console.log("Deploying CarbonCreditPlatform...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("CarbonCreditPlatform");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅ CarbonCreditPlatform deployed to:", address);
  console.log("   Deployer (admin + first verifier):", deployer.address);
  console.log("\nSave this contract address — you'll need it for the backend and frontend.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
