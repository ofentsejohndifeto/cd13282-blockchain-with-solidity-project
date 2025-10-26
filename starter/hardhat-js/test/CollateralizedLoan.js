// Importing necessary modules and functions from Hardhat and Chai for testing
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Describing a test suite for the CollateralizedLoan contract
describe("CollateralizedLoan", function () {
  // A fixture to deploy the contract before each test. This helps in reducing code repetition.
  async function deployCollateralizedLoanFixture() {
    // Deploying the CollateralizedLoan contract and returning necessary variables
    // TODO: Complete the deployment setup

    // Retrieve signers from Hardhat (owner, borrower, and lender simulate different users)
    const [owner, borrower, lender] = await ethers.getSigners();

    // Get the contract factory (compiled contract ready for deployment)
    const CollateralizedLoan = await ethers.getContractFactory("CollateralizedLoan");

    // Deploy the CollateralizedLoan contract to the local Hardhat test blockchain
    const loanContract = await CollateralizedLoan.deploy();

    // Return useful variables for use in multiple tests
    return {loanContract, owner, borrower, lender };
  }

  // Test suite for the loan request functionality
  describe("Loan Request", function () {
    it("Should let a borrower deposit collateral and request a loan", async function () {
      // Loading the fixture
      // TODO: Set up test for depositing collateral and requesting a loan
      // HINT: Use .connect() to simulate actions from different accounts
      const { loanContract, borrower } = await deployCollateralizedLoanFixture();

      // Define variables for test
      const collateral = ethers.parseEther("1"); // 1 ETH sent as collateral
      const interestRate = 10; // 10% interest
      const duration = 7 * 24 * 60 * 60; // 7 days (in seconds)

      // Deposit collateral and request loan
      // .connect(borrower) means this action is performed by the borrower account
      // The function call should emit a LoanRequested event with correct parameters
      await expect(
        loanContract.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateral })
      ).to.emit(loanContract, "LoanRequested")
        .withArgs(1, borrower.address);

      // Fetch loan from the contract's storage mapping
      const loan = await loanContract.loans(1);

      // Assertions: check if data stored correctly
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.collateralAmount).to.equal(collateral);
      expect(loan.isFunded).to.be.false; // Should not be funded yet
    });
  });

  // Test suite for funding a loan
  describe("Funding a Loan", function () {
    it("Allows a lender to fund a requested loan", async function () {
      // Loading the fixture
      // TODO: Set up test for a lender funding a loan
      // HINT: You'll need to check for an event emission to verify the action
      const { loanContract, borrower, lender } = await deployCollateralizedLoanFixture();

      // Define test variables
      const collateral = ethers.parseEther("1"); // 1 ETH collateral
      const interestRate = 10;
      const duration = 86400; // 1 day in seconds

      // Borrower requests loan by depositing collateral
      await loanContract.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateral });

      // Lender funds the loan with the same amount as collateral
      // Expect the "Funded" event to emit confirming the loan was funded
      await expect(
        loanContract.connect(lender).fundLoan(1, { value: collateral })
      ).to.emit(loanContract, "Funded")
        .withArgs(1, true, lender.address);

      // Retrieve loan to verify internal data
      const loan = await loanContract.loans(1);

      // Assert the loan is now funded and lender address is recorded
      expect(loan.isFunded).to.be.true;
      expect(loan.lender).to.equal(lender.address);
    });
  });

  // Test suite for repaying a loan
  describe("Repaying a Loan", function () {
    it("Enables the borrower to repay the loan fully", async function () {
      // Loading the fixture
      // TODO: Set up test for a borrower repaying the loan
      // HINT: Consider including the calculation of the repayment amount
      const { loanContract, borrower, lender } = await deployCollateralizedLoanFixture();

      // Define test variables
      const collateral = ethers.parseEther("1"); // 1 ETH collateral
      const interestRate = 10; // 10%
      const duration = 86400; // 1 day (in seconds)

      // Calculate total repayment = collateral + interest
      const loanAmount = collateral + (collateral * BigInt(interestRate) / 100n);

      // Borrower requests and lender funds the loan
      await loanContract.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateral });
      await loanContract.connect(lender).fundLoan(1, { value: collateral });

      // Borrower repays the loan by sending the calculated amount (including interest)
      await expect(
        loanContract.connect(borrower).repayLoan(1, { value: loanAmount })
      ).to.emit(loanContract, "Repaid")
        .withArgs(1, true, borrower.address);

      // Verify loan status updated correctly
      const loan = await loanContract.loans(1);
      expect(loan.isRepaid).to.be.true;
    });
  });

  // Test suite for claiming collateral
  describe("Claiming Collateral", function () {
    it("Permits the lender to claim collateral if the loan isn't repaid on time", async function () {
      const { loanContract, borrower, lender } = await deployCollateralizedLoanFixture();

      // Define test parameters
      const collateral = ethers.parseEther("1");
      const interestRate = 10;
      const duration = 86400; // 1 day

      // Request + fund loan sequence
      await loanContract.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateral });
      await loanContract.connect(lender).fundLoan(1, { value: collateral });

      // Simulate time passing — move blockchain time forward, took forever :(
      // This allows the test to bypass the due date check in claimCollateral()
      await ethers.provider.send("evm_increaseTime", [duration + 10]); // 1 day + 10 seconds
      await ethers.provider.send("evm_mine"); // mine a block to apply the time change

      // Lender claims collateral because borrower failed to repay on time
      await expect(
        loanContract.connect(lender).claimCollateral(1)
      ).to.emit(loanContract, "CollateralClaimed")
        .withArgs(1, borrower.address);

      // After claiming, collateral amount should be zero to prevent reentrancy
      const loan = await loanContract.loans(1);
      expect(loan.collateralAmount).to.equal(0);
    });
  });
});
