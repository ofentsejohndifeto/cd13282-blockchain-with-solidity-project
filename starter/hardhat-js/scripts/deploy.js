const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get the contract factory for the CollateralizedLoan contract
  const CollateralizedLoan = await hre.ethers.getContractFactory(
    "CollateralizedLoan"
  );

  // Deploy the contract
  const contract = await CollateralizedLoan.deploy();

  // The contract is now deployed, and you can log its address
  console.log(`CollateralizedLoan deployed  to:`, contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("An error occurred during deployment:", error);
    process.exit(1);
  });
