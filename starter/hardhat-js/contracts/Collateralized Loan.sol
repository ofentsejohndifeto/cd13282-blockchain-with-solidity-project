// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Collateralized Loan Contract
contract CollateralizedLoan {
    // Define the structure of a loan
    struct Loan {
        uint loanId; //added loan ID to differentaiate loans by mapping
        address payable borrower;  //added payable
        // Hint: Add a field for the lender's address
        address payable lender;

        uint256 collateralAmount;  //consistency in Ethereum
        // Hint: Add fields for loan amount, interest rate, due date, isFunded, isRepaid
        uint256 loanAmount; 
        uint interestRate;      //can be (500 = 5%)
        uint dueDate;           //unix timestamp (block.timestamp + duration)
        bool isFunded;
        bool isRepaid;
    }

    // Create a mapping to manage the loans
    mapping(uint => Loan) public loans;
    uint public nextLoanId;  //counter

    // Hint: Define events for loan requested, funded, repaid, and collateral claimed
    event LoanRequested(uint loanId, address borrower);
    event Funded(uint loanId, bool isFunded, address lender);
    event Repaid(uint loanId,bool isRepaid, address borrower);
    event CollateralClaimed(uint loanId, address borrower);

    // Custom Modifiers
    // Hint: Write a modifier to check if a loan exists
    modifier loanExists(uint256 loanId) {
        require(loans[loanId].borrower != address(0), "Loan does not exist");  //borrower varibale must not be empty
        _;
    }

    // Hint: Write a modifier to ensure a loan is not already funded
    modifier loanNotFunded(uint256 loanId){
        require(!loans[loanId].isFunded, 'Loan is already funded');
        _;
    }

    modifier loanNotRepaid(uint256 loanId){
        require(!loans[loanId].isRepaid, 'Loan is already Repaid');
        _;
    }

    // Function to deposit collateral and request a loan
    function depositCollateralAndRequestLoan(uint256 _interestRate, uint256 _duration) external payable {
        // Hint: Check if the collateral is more than 0
        require(msg.value > 0, 'Collateral must be greater than 0');
        // Hint: Calculate the loan amount based on the collateralized amount
        uint256 loanAmount = msg.value + (msg.value * _interestRate) / 100;  

        // Hint: Increment nextLoanId and create a new loan in the loans mapping
        nextLoanId ++;  //loanId starts at 1 skipping zero
        loans[nextLoanId] = Loan({
            loanId: nextLoanId,
            borrower: payable(msg.sender),
            lender: payable(address(0)),
            collateralAmount: msg.value,
            loanAmount: loanAmount,
            interestRate: _interestRate,
            dueDate: block.timestamp + _duration,   // duration plus current block time
            isFunded: false,
            isRepaid: false
        });
        
        // Hint: Emit an event for loan request
        emit LoanRequested(nextLoanId, msg.sender);
    }

    // Function to fund a loan
    // Hint: Write the fundLoan function with necessary checks and logic
    function fundLoan(uint _loanId) loanExists(_loanId) loanNotFunded(_loanId) external payable {  //loanExists and loanNotFunded
        //variable for current loan
        Loan storage loan = loans[_loanId];  

        //check msg.value equals funded amount
        require(msg.value == loan.collateralAmount, "Must fund with collateral amount"); // chek msg.value equals funded amount
        //check if borrower is lender
        require(loan.borrower != msg.sender, "You cannot fund your own loan");
        
        //update loan
        loan.lender = payable(msg.sender);
        loan.isFunded = true;

        //transfer loan funds to borrower
        (bool sent, ) = loan.borrower.call{value: msg.value}(""); //no data payload
        require(sent, "Failed to send funds to borrower");

        emit Funded(_loanId, true, msg.sender);
    }

    // Function to repay a loan
    // Hint: Write the repayLoan function with necessary checks and logic
    function repayLoan(uint _loanId) loanExists(_loanId) loanNotRepaid(_loanId)  external payable {
        //variable for current loan
        Loan storage loan = loans[_loanId];  

        //check msg.value equals funded amount
        require(msg.value == loan.loanAmount, "Must fund with loan amount"); // chek msg.value equals funded amount
        //only borrower can repay
        require(msg.sender == loan.borrower, "Only borrower can repay");

        //update loan
        loan.isRepaid = true;

        //transfer loan amount to repay
        (bool sent, ) = loan.lender.call{value: msg.value}(""); //no data payload
        require(sent, "Failed to send funds to lender");

        //emit Repaid
        emit Repaid(_loanId, true, msg.sender);
    }

        // Function to claim collateral on default
        // Hint: Write the claimCollateral function with necessary checks and logic
        function claimCollateral(uint _loanId) loanExists(_loanId) external {
        Loan storage loan = loans[_loanId];

        require(loan.isFunded, "Loan not funded");
        require(!loan.isRepaid, "Loan already repaid");
        require(block.timestamp > loan.dueDate, "Loan not yet due");
        require(msg.sender == loan.lender, "Only lender can claim collateral");

        uint collateral = loan.collateralAmount;
        loan.collateralAmount = 0; // prevent reentrancy

        (bool sent, ) = loan.lender.call{value: collateral}("");
        require(sent, "Failed to send collateral");

        emit CollateralClaimed(_loanId, loan.borrower);
    }
}