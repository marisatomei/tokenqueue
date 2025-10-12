// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title WaitToken
 * @dev ERC20 token with controlled minting
 * Only the TokenSale contract can mint new tokens
 */
contract WaitToken is ERC20 {
    address public tokenSaleContract;

    event TokenSaleContractSet(address indexed tokenSaleContract);

    /**
     * @dev Constructor initializes the token with name and symbol
     * No initial supply - tokens are minted via TokenSale contract
     */
    constructor() ERC20("WaitToken", "WAIT") {
        // No initial mint - tokens created through TokenSale
    }

    /**
     * @dev Modifier to restrict function access to only the TokenSale contract
     */
    modifier onlyTokenSale() {
        require(msg.sender == tokenSaleContract, "WaitToken: Only TokenSale can call this");
        _;
    }

    /**
     * @dev Sets the TokenSale contract address that can mint tokens
     * Can only be set once to prevent unauthorized changes
     * @param _tokenSaleContract Address of the TokenSale contract
     */
    function setTokenSaleContract(address _tokenSaleContract) external {
        require(tokenSaleContract == address(0), "WaitToken: TokenSale already set");
        require(_tokenSaleContract != address(0), "WaitToken: Invalid address");

        tokenSaleContract = _tokenSaleContract;
        emit TokenSaleContractSet(_tokenSaleContract);
    }

    /**
     * @dev Mints new tokens to a specified address
     * Can only be called by the TokenSale contract
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in wei units)
     */
    function mint(address to, uint256 amount) external onlyTokenSale {
        require(to != address(0), "WaitToken: Cannot mint to zero address");
        require(amount > 0, "WaitToken: Amount must be greater than zero");

        _mint(to, amount);
    }
}
