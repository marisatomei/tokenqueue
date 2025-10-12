# Decentralized Waiting List System Project

The objective of this project is to design and develop a decentralized waiting list system using blockchain technology. Students will be required to implement a smart contract in `Solidity`, deploy it on the Binance Smart Chain (BSC) Testnet, and develop a web application (a DApp in `React` with `ethers.js` and `ethers-decode-errors`) that allows users to interact with the contract.

This project aims to integrate the knowledge acquired in smart contracts, token usage, front-end blockchain interactions, transaction security, and audit transparency, applied to a real-world use case.

---

## Minimum Required Functionalities

### **Smart Contract (`Solidity`)**

1.  **ERC20 Token Creation**
    * Implement a custom token named `WaitToken` (ERC20 compliant) using OpenZeppeling ERC20 definition.

2.  **Purchase of `WaitToken`**
    * A `buyToken()` function that allows users to send `0.01 tBNB` to receive 1 `WaitToken`.
    * **Bonus**: For each `WaitToken` the user already holds in their wallet, they receive 1 additional `WaitToken`. The user's `WaitToken` balance must be checked.
    * The user can buy tokens multiple times.

3.  **Waiting List Registration**
    * To register, the user must send 1 `WaitToken`.
    * The contract must validate that the user transfers this token correctly.
    * Each user can only be registered on the list once. If they are already registered, they should not be allowed to register again.
    * The position on the list is assigned on a first-come, first-served basis.

4.  **List Management by Administrator**
    * The contract has an `admin` address (the contract creator's address; the wallet's own address can be used).
    * The `admin` can execute a function to remove the first user from the list.
    * The removed user is refunded their 1 `WaitToken`.
    * This action can be repeated as many times as needed, always removing the current first user on the list.

5.  **Voluntary User Withdrawal**
    * A user registered on the list can execute a function to give up their spot.
    * Upon doing so, they only recover half of the `WaitToken` used for registration (0.5 `WaitToken`).
    * The other half is retained in the contract (symbolizing a penalty for withdrawing).

6.  **Check My Position on the List**
    * Checks if the `address` of the user calling the function is on the list and returns their position.

7.  **Events**
    * Event when a user buys tokens (address and amount).
    * Event when a user registers on the list (address and position).
    * Event when the `admin` removes a user from the list (address of the removed user).
    * Event when a user withdraws (address and partial refund received).

### **Decentralized Web Application (`React` + `ethers.js`)**

1.  **Wallet Connection**
    * Connect to a wallet (e.g., MetaMask) on the BSC Testnet.
    * For the moment only implement MetaMask button connection
    * Follow `index.html` styles for the home page

2.  **Real-Time Interaction**
    * Buy `WaitToken` by sending `tBNB`.
    * View the user's `WaitToken` balance.
    * Register on the list by sending 1 `WaitToken`.
    * Check the user's position on the list.
    * Display a button to remove the first user from the list, which can only be executed by the contract `admin`.
    * An option for the user to withdraw and receive their partial token refund.