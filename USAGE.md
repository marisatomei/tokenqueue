# TokenQueue - Usage Guide

## Overview
TokenQueue is a decentralized waiting list system built on Ethereum, featuring a bonus token system and upgradeable smart contracts.

## Prerequisites

1. **MetaMask Wallet** - Install the MetaMask browser extension
2. **Hardhat Local Network** - Running on `http://127.0.0.1:8545`
3. **Test ETH** - Available from Hardhat's pre-funded accounts

## Getting Started

### 1. Start the Infrastructure

```bash
# Build and start Docker containers
npm run docker:build
npm run docker:up

# Wait a few seconds, then compile and deploy contracts
npm run hardhat:compile
npm run hardhat:deploy
```

### 2. Start the Frontend

```bash
# Start the Next.js development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

### 3. Configure MetaMask

#### Add Hardhat Local Network

1. Open MetaMask
2. Click the network dropdown (usually shows "Ethereum Mainnet")
3. Click "Add Network" → "Add network manually"
4. Enter the following details:
   - **Network Name:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
5. Click "Save"

#### Import Test Account

Use one of Hardhat's pre-funded test accounts:

1. In MetaMask, click your account icon → "Import Account"
2. Select "Private Key"
3. Paste one of these private keys:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

4. Click "Import"
5. You should see ~10,000 ETH balance

## Using the DApp

### Step 1: Connect Your Wallet

1. Click "Connect Wallet" button in the top right
2. MetaMask will prompt you to connect - click "Connect"
3. Ensure you're on the "Hardhat Local" network (Chain ID: 31337)

### Step 2: Purchase WAIT Tokens

The token purchase system has a unique bonus mechanism:

- **First purchase:** Pay 0.01 tBNB → Get 1 WAIT token
- **Second purchase:** Pay 0.01 tBNB → Get 2 WAIT tokens (1 + your balance of 1)
- **Third purchase:** Pay 0.01 tBNB → Get 4 WAIT tokens (1 + your balance of 3)
- **Fourth purchase:** Pay 0.01 tBNB → Get 8 WAIT tokens (1 + your balance of 7)

**How to buy:**
1. Click "Buy X WAIT for 0.01 tBNB" button
2. MetaMask will prompt for transaction approval
3. Confirm the transaction
4. Wait for blockchain confirmation (~1 second)
5. Your balance updates automatically

### Step 3: Join the Queue

To join the waiting list:

1. Ensure you have at least 1 WAIT token
2. Click "Join Queue (1 WAIT)" button
3. Approve two transactions:
   - **First:** Approve contract to spend your tokens
   - **Second:** Join the queue
4. Once confirmed, you'll see:
   - Status changes to "In Queue"
   - Your position number appears
   - You appear in the "Current Queue" list

### Step 4: Leave the Queue (Optional)

You have two options to leave:

#### Voluntary Leave (Partial Refund)
- Click "Leave Queue (Get 0.5 WAIT back)"
- You receive 50% refund (0.5 WAIT tokens)
- Your position is removed immediately

#### Admin Removal (Full Refund)
- Wait for the admin to remove you
- You receive 100% refund (1 WAIT token)
- Admin removes from the front of the queue

### Step 5: Admin Functions (Owner Only)

If you deployed the contracts (Account #0), you'll see the Admin Panel:

1. **Remove First User:**
   - Removes the first person in the queue
   - Automatically refunds them 1 WAIT token
   - Use this to process the queue

## Smart Contract Addresses

After deployment, contracts are located at:

- **WaitToken:** Check `src/constants/config.js`
- **TokenSale:** Check `src/constants/config.js`
- **WaitingList (Proxy):** Check `src/constants/config.js`

## Features

### Token Bonus System
- **Formula:** `tokens_received = 1 + current_balance`
- Exponential growth: 1 → 3 → 7 → 15 → 31 → 63...
- Encourages early adoption and continued engagement

### Queue Management
- **FIFO (First In, First Out)** ordering
- **Join Cost:** 1 WAIT token
- **Voluntary Leave Refund:** 0.5 WAIT tokens
- **Admin Removal Refund:** 1 WAIT token (full refund)

### Upgradeable Contracts
- **WaitingList** uses UUPS Proxy Pattern
- Can be upgraded without changing the proxy address
- Only owner can authorize upgrades

## Troubleshooting

### "Wrong network" Warning
- Switch MetaMask to "Hardhat Local" network
- Ensure Hardhat node is running (`npm run docker:logs`)

### "Insufficient tokens" Error
- Purchase more WAIT tokens first
- Each queue registration costs 1 WAIT token

### Transaction Fails
- Check if Hardhat node is running: `npm run docker:logs`
- Restart Hardhat if needed: `npm run docker:restart`
- Re-deploy contracts if necessary: `npm run hardhat:deploy`

### MetaMask Shows 0 ETH
- Ensure you imported a Hardhat test account (see above)
- Ensure you're on the Hardhat Local network

### Page Won't Load
- Check dev server is running: `npm run dev`
- Clear browser cache and reload
- Check browser console for errors (F12)

## Development Commands

```bash
# Docker Management
npm run docker:build          # Build containers
npm run docker:up             # Start containers
npm run docker:down           # Stop containers
npm run docker:logs           # View Hardhat logs
npm run docker:restart        # Restart Hardhat node

# Smart Contracts
npm run hardhat:compile       # Compile contracts
npm run hardhat:test          # Run tests (87 tests)
npm run hardhat:deploy        # Deploy to local network
npm run hardhat:clean         # Clean artifacts

# Frontend
npm run dev                   # Start Next.js dev server
npm run build                 # Build for production
npm run start                 # Start production server

# Complete Setup
npm run dev:setup             # Build, start, compile, and deploy everything
npm run dev:all               # Start Hardhat + Next.js together
```

## Architecture

### Smart Contracts (Solidity 0.8.28)

1. **WaitToken.sol** - ERC20 token with controlled minting
2. **TokenSale.sol** - Token purchase with bonus system
3. **WaitingList.sol** - UUPS upgradeable queue management

### Frontend (Next.js 15 + React 19)

- **Web3Context:** Manages wallet connection and contract instances
- **WalletConnect:** Connect/disconnect MetaMask
- **TokenPurchase:** Buy WAIT tokens with bonus display
- **QueueManagement:** Join/leave queue functionality
- **QueueDisplay:** Real-time queue visualization
- **AdminPanel:** Owner-only queue management

### Tech Stack

- **Blockchain:** Ethereum (Hardhat local node)
- **Smart Contracts:** Solidity 0.8.28
- **Standards:** ERC20, ERC1967 (UUPS Proxy)
- **Frontend:** Next.js 15, React 19, Tailwind CSS v4
- **Web3:** ethers.js v6.15.0, MetaMask
- **Testing:** Hardhat, Chai (87 tests, 100% passing)
- **Deployment:** Docker, docker-compose

## Testing

Run the complete test suite:

```bash
# Run all 87 tests
npm run hardhat:test

# Expected output:
# ✓ WaitToken: 45 tests passing
# ✓ TokenSale: 26 tests passing
# ✓ WaitingList: 16 tests passing
# Total: 87 passing
```

## Security Notes

- **Development Only:** This setup is for local development
- **Test Accounts:** Use only Hardhat test accounts with test ETH
- **Private Keys:** Never use these private keys for real funds
- **Local Network:** Contracts are deployed on local Hardhat network only

## Next Steps

1. **Explore the UI** - Test all features with multiple accounts
2. **Review Smart Contracts** - Check `contracts/` directory
3. **Read Tests** - Understand behavior in `test/` directory
4. **Customize** - Modify components in `src/components/`
5. **Deploy to Testnet** - Use `npm run hardhat:deploy:testnet` (configure .env first)

## Support

For issues or questions:
- Check console logs (browser F12 and terminal)
- Review `SPECIFICATION.md` for requirements
- Check `IMPLEMENTATION_PLAN.md` for architecture
- Review `CLAUDE.md` for project overview

---

Built with ❤️ using Solidity, Hardhat, Next.js, and ethers.js
