// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./WaitToken.sol";

/**
 * @title TokenSale
 * @dev Manages token sales with bonus system
 * Users send 0.01 tBNB to receive 1 WaitToken + bonus based on current balance
 */
contract TokenSale {
    WaitToken public waitToken;
    address public owner;
    uint256 public constant TOKEN_PRICE = 0.01 ether;
    uint256 public constant BASE_TOKEN_AMOUNT = 1 ether; // 1 token in wei (18 decimals)

    event TokenPurchased(address indexed buyer, uint256 amount);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    /**
     * @dev Constructor sets the WaitToken contract address and owner
     * @param _waitTokenAddress Address of the deployed WaitToken contract
     */
    constructor(address _waitTokenAddress) {
        require(_waitTokenAddress != address(0), "TokenSale: Invalid WaitToken address");

        waitToken = WaitToken(_waitTokenAddress);
        owner = msg.sender;
    }

    /**
     * @dev Modifier to restrict function access to only the owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "TokenSale: Only owner can call this");
        _;
    }

    /**
     * @dev Allows users to buy tokens by sending exactly 0.01 tBNB
     * Bonus system: User receives 1 token + (current balance) bonus tokens
     * Example: If user has 5 tokens, they receive 1 + 5 = 6 tokens per purchase
     */
    function buyToken() external payable {
        require(msg.value == TOKEN_PRICE, "TokenSale: Must send exactly 0.01 tBNB");

        // Get buyer's current token balance
        uint256 currentBalance = waitToken.balanceOf(msg.sender);

        // Calculate tokens to mint: 1 base token + current balance as bonus
        uint256 tokensToMint = BASE_TOKEN_AMOUNT + currentBalance;

        // Mint tokens to buyer
        waitToken.mint(msg.sender, tokensToMint);

        emit TokenPurchased(msg.sender, tokensToMint);
    }

    /**
     * @dev Allows owner to withdraw accumulated tBNB from token sales
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "TokenSale: No funds to withdraw");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "TokenSale: Transfer failed");

        emit FundsWithdrawn(owner, balance);
    }

    /**
     * @dev Returns the contract's tBNB balance
     * @return Balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
