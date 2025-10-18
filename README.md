# TokenQueue

TokenQueue is a decentralized waiting list system built on Ethereum, featuring a bonus token system and upgradeable smart contracts.

**Tech Stack:** Solidity 0.8.28, Hardhat, Next.js 15, React 19, ethers.js v6, Tailwind CSS v4

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step-by-Step Setup](#step-by-step-setup)
- [Configure MetaMask](#configure-metamask)
- [Using the DApp](#using-the-dapp)
- [Development Commands](#development-commands)
- [Running Tests](#running-tests)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Testnet Deployment](#testnet-deployment-optional)
- [Security Notes](#security-notes)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or later) - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **MetaMask** browser extension - [Install](https://metamask.io/)
- **Git** - [Download](https://git-scm.com/)

## Quick Start

For a completely fresh start, run:

```bash
# 1. Clone the repository
git clone <repository-url>
cd tokenqueue

# 2. Install dependencies (also creates placeholder files)
npm install

# 3. Run complete setup (builds Docker, starts Hardhat, compiles & deploys contracts)
npm run dev:setup

# 4. Start the frontend
npm run dev
```

Then open http://localhost:3001 in your browser and proceed to [Configure MetaMask](#configure-metamask).

## Step-by-Step Setup

If you prefer to run each step manually or if the quick start fails:

### 1. Install Dependencies

```bash
npm install
```

This will:
- Install all Node.js dependencies
- Automatically create placeholder files for ABIs and config (via postinstall script)

### 2. Build Docker Containers

```bash
npm run docker:build
```

This builds the Docker image with Hardhat, OpenZeppelin contracts, and all required dependencies.

### 3. Start Hardhat Node

```bash
npm run docker:up
```

This starts the Hardhat local blockchain node on http://127.0.0.1:8546

Verify it's running:
```bash
npm run docker:logs
```

You should see "Started HTTP and WebSocket JSON-RPC server"

### 4. Compile Smart Contracts

```bash
npm run hardhat:compile
```

This compiles the three Solidity contracts:
- WaitToken.sol
- TokenSale.sol
- WaitingList.sol

### 5. Deploy Contracts

```bash
npm run hardhat:deploy
```

This will:
- Deploy all three contracts to the local network
- Generate `src/utils/abis.js` with contract ABIs
- Generate `src/constants/config.js` with deployed addresses
- Automatically sync these files from the Docker container to your host

### 6. Start Frontend

```bash
npm run dev
```

The Next.js app will start on http://localhost:3001

## Configure MetaMask

### Add Hardhat Local Network

1. Open MetaMask
2. Click the network dropdown (usually shows "Ethereum Mainnet")
3. Click "Add Network" → "Add network manually"
4. Enter the following details:
   - **Network Name:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8546`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
5. Click "Save"

### Import Test Account

Use one of Hardhat's pre-funded test accounts:

1. In MetaMask, click your account icon → "Import Account"
2. Select "Private Key"
3. Paste one of these private keys:

```
Account #0 (Deployer/Owner):
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1:
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2:
Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

4. Click "Import"
5. You should see ~10,000 ETH balance

### Verify Setup

Visit http://localhost:3001 and:

1. Click "Connect Wallet"
2. Approve the connection in MetaMask
3. Verify you see your account address and "Hardhat Local" network
4. Try buying a WAIT token to test the system

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

**Formula:** `tokens_received = 1 + current_balance`

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

## Development Commands

### Initial Setup
```bash
npm run dev:setup              # Full setup: build Docker, start Hardhat, compile, deploy
```

### Docker & Hardhat Management
```bash
npm run docker:build           # Build Docker containers
npm run docker:up              # Start Hardhat node (runs on port 8546)
npm run docker:down            # Stop containers
npm run docker:logs            # View Hardhat node logs
npm run docker:restart         # Restart Hardhat node
```

### Smart Contract Development
```bash
npm run hardhat:compile        # Compile contracts
npm run hardhat:test           # Run all tests (87 tests)
npm run hardhat:deploy         # Deploy to local network + sync ABIs/config
npm run hardhat:clean          # Clean artifacts and cache
npm run docker:sync            # Manually sync ABIs and config from container
```

### Frontend Development
```bash
npm run dev                    # Start Next.js dev server (port 3001)
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint
```

### Running a Single Test
```bash
# Execute inside Docker container:
docker compose exec hardhat npx hardhat test --grep "test name pattern"
```

### Redeploying After Contract Changes

If you make changes to smart contracts:

```bash
npm run hardhat:clean          # Clear old artifacts
npm run hardhat:compile        # Compile new contracts
npm run hardhat:deploy         # Deploy + auto-sync ABIs/config
```

**Note:** Redeployment changes contract addresses. All previous state is lost on local network.

### Daily Development Workflow

```bash
# Start Hardhat (if not running)
npm run docker:up

# Start frontend
npm run dev

# Make changes to contracts...

# Recompile and redeploy
npm run hardhat:clean
npm run hardhat:compile
npm run hardhat:deploy

# Refresh browser to use new contracts
```

## Running Tests

Run the complete test suite (87 tests):

```bash
npm run hardhat:test
```

Expected output:
```
✓ WaitToken: 45 tests passing
✓ TokenSale: 26 tests passing
✓ WaitingList: 16 tests passing
Total: 87 passing
```

Run a specific test:
```bash
docker compose exec hardhat npx hardhat test --grep "should allow users to buy tokens"
```

## Troubleshooting

### Issue: `npm run dev:setup` fails immediately

**Solution:** Ensure Docker Desktop is running
```bash
docker --version
docker compose version
```

### Issue: "Cannot find module '@/utils/abis'"

**Solution:** The placeholder files weren't created. Run:
```bash
node scripts/setup-templates.js
```

### Issue: Docker build fails with "no matching manifest"

**Solution:** Your CPU architecture isn't supported. Edit `docker-compose.yml` and remove the `platforms` section.

### Issue: "Error: could not detect network"

**Solution:** Hardhat node isn't running or isn't accessible
```bash
npm run docker:restart
npm run docker:logs
```

### Issue: Deployment fails with "execution reverted"

**Solution:** Clear old state and redeploy
```bash
npm run docker:down
npm run docker:up
# Wait 5 seconds
npm run hardhat:deploy
```

### Issue: MetaMask shows "Internal JSON-RPC error"

**Solution:** Reset MetaMask account
1. MetaMask → Settings → Advanced → "Clear activity tab data"
2. Refresh the page

### Issue: Frontend shows "Wrong network"

**Solution:** Switch MetaMask to Hardhat Local (Chain ID: 31337)

### Issue: "Module not found: @openzeppelin/contracts"

**Solution:** The dependencies weren't installed correctly
```bash
rm -rf node_modules package-lock.json
npm install
npm run docker:build
```

### Issue: "Insufficient tokens" Error

**Solution:** Purchase more WAIT tokens first. Each queue registration costs 1 WAIT token.

### Issue: Transaction Fails

**Solution:**
- Check if Hardhat node is running: `npm run docker:logs`
- Restart Hardhat if needed: `npm run docker:restart`
- Re-deploy contracts if necessary: `npm run hardhat:deploy`

### Issue: MetaMask Shows 0 ETH

**Solution:**
- Ensure you imported a Hardhat test account (see Configure MetaMask section)
- Ensure you're on the Hardhat Local network

### Issue: Page Won't Load

**Solution:**
- Check dev server is running: `npm run dev`
- Clear browser cache and reload
- Check browser console for errors (F12)

## Project Structure

```
tokenqueue/
├── contracts/              # Solidity smart contracts
│   ├── WaitToken.sol      # ERC20 token with controlled minting
│   ├── TokenSale.sol      # Token purchase with bonus system
│   └── WaitingList.sol    # UUPS upgradeable queue management
├── scripts/               # Deployment and utility scripts
│   ├── deploy.js          # Main deployment script
│   ├── setup-templates.js # Creates placeholder files
│   └── sleep.js           # Cross-platform sleep utility
├── test/                  # Contract tests (87 tests)
│   ├── WaitToken.test.js
│   ├── TokenSale.test.js
│   └── WaitingList.test.js
├── src/
│   ├── app/              # Next.js app router
│   │   ├── layout.js
│   │   └── page.js
│   ├── components/       # React components
│   │   ├── WalletConnect.js      # MetaMask connection
│   │   ├── TokenPurchase.js      # Buy WAIT tokens
│   │   ├── QueueManagement.js    # Join/leave queue
│   │   ├── QueueDisplay.js       # Queue visualization
│   │   └── AdminPanel.js         # Owner functions
│   ├── contexts/         # React contexts
│   │   └── Web3Context.js        # Web3 state management
│   ├── utils/            # Utilities
│   │   ├── abis.js              # Auto-generated contract ABIs
│   │   ├── errorHandler.js      # Error decoding
│   │   └── consoleFilter.js     # Console filtering
│   └── constants/        # Configuration
│       └── config.js             # Auto-generated contract addresses
├── docker/
│   └── Dockerfile        # Hardhat container definition
├── docker-compose.yml    # Docker orchestration
├── hardhat.config.js     # Hardhat configuration
└── package.json          # Dependencies and scripts
```

### Auto-Generated Files

These files are created during deployment and should NOT be edited manually:

- `src/utils/abis.js` - Contract ABIs (Application Binary Interfaces)
- `src/constants/config.js` - Deployed contract addresses and network config
- `artifacts/` - Compiled contract artifacts
- `cache/` - Hardhat cache

They are gitignored and will be regenerated when you run `npm run hardhat:deploy`.

**Template Files (committed to git):**
- `src/utils/abis.js.template` - Placeholder template
- `src/constants/config.js.template` - Placeholder template

These templates are automatically copied to actual files by `scripts/setup-templates.js` during `npm install`.

## Architecture

### Smart Contracts (Solidity 0.8.28)

The system consists of three interconnected contracts:

1. **WaitToken.sol** - ERC20 token
   - Minting controlled exclusively by TokenSale contract
   - `setTokenSaleContract()` can only be called once during deployment

2. **TokenSale.sol** - Token purchase with exponential bonus
   - Fixed price: 0.01 tBNB per purchase
   - Bonus formula: `tokens_minted = 1 + current_user_balance`
   - Results in exponential growth: 1 → 3 → 7 → 15 → 31 → 63...

3. **WaitingList.sol** - UUPS upgradeable queue management
   - Deployed as UUPS proxy (ERC1967 pattern)
   - FIFO queue with 1 WAIT token registration cost
   - Voluntary leave: 0.5 WAIT refund, Admin removal: 1 WAIT full refund
   - Only owner can upgrade via `_authorizeUpgrade()`

**Contract Interactions:**
- Users buy tokens from TokenSale → TokenSale mints via WaitToken
- Users approve WaitingList to spend WAIT tokens → join queue
- Queue uses internal array with position tracking mappings

### Frontend (Next.js 15 + React 19)

**Web3Context** (`src/contexts/Web3Context.js`) - Central state management
- Manages MetaMask connection, account, chainId, provider, signer
- Initializes contract instances (waitTokenContract, tokenSaleContract, waitingListContract)
- Handles network switching to Hardhat Local (chainId 31337)
- Listens to accountsChanged and chainChanged events

**Component Architecture:**
- All components use `useWeb3()` hook to access contracts
- Error handling via `errorHandler.js` using ethers-decode-error
- Console filtering to suppress expected gas estimation errors

### Deployment Flow

The deployment script (`scripts/deploy.js`) performs these steps:
1. Deploy WaitToken
2. Deploy TokenSale with WaitToken address
3. Call `WaitToken.setTokenSaleContract(tokenSale)`
4. Deploy WaitingList as UUPS proxy with upgrades.deployProxy()
5. Auto-generate `src/utils/abis.js` with all contract ABIs
6. Auto-generate `src/constants/config.js` with deployed addresses and network config

### UUPS Proxy Pattern

WaitingList uses UUPS (Universal Upgradeable Proxy Standard):
- Proxy address remains constant (users interact here)
- Implementation can be upgraded by owner
- Storage lives in proxy, logic in implementation
- Upgrade authorization in `_authorizeUpgrade()` implementation

### Queue Management

- Queue stored as `address[] queue` with `mapping(address => uint256) queuePositions`
- Removal shifts all subsequent elements and updates their positions
- `isInQueue` mapping prevents duplicate joins
- Position returned as 1-indexed for user display, stored as 0-indexed internally

### Tech Stack

- **Blockchain:** Ethereum (Hardhat local node)
- **Smart Contracts:** Solidity 0.8.28
- **Standards:** ERC20, ERC1967 (UUPS Proxy)
- **Frontend:** Next.js 15, React 19, Tailwind CSS v4
- **Web3:** ethers.js v6.15.0, MetaMask
- **Testing:** Hardhat, Chai (87 tests, 100% passing)
- **Deployment:** Docker, docker-compose

## Testnet Deployment (Optional)

To deploy to BSC Testnet:

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Private Key

Edit `.env` and add your private key (without 0x prefix):
```
PRIVATE_KEY=your_private_key_here
```

**⚠️ NEVER commit your actual private key to git!**

### 3. Get Testnet BNB

Get testnet BNB from the [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart)

### 4. Deploy

```bash
npm run hardhat:deploy:testnet
```

This deploys to BSC Testnet (Chain ID: 97) using the RPC URL configured in `hardhat.config.js`.

## Security Notes

- **Development Only:** This setup is for local development
- **Test Accounts:** Use only Hardhat test accounts with test ETH
- **Private Keys:** Never use these private keys for real funds
- **Local Network:** Contracts are deployed on local Hardhat network only
- **Testnet:** Only use testnet for testing, never use real funds

## Smart Contract Addresses

After deployment, contract addresses are stored in `src/constants/config.js`:

- **WaitToken:** ERC20 token contract
- **TokenSale:** Token purchase contract
- **WaitingList (Proxy):** User-facing queue contract
- **WaitingList (Implementation):** Actual contract logic

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

## Next Steps

1. **Explore the UI** - Test all features with multiple accounts
2. **Review Smart Contracts** - Check `contracts/` directory
3. **Read Tests** - Understand behavior in `test/` directory
4. **Customize** - Modify components in `src/components/`
5. **Deploy to Testnet** - Use `npm run hardhat:deploy:testnet` (configure .env first)
6. **Check Architecture Details** - See `CLAUDE.md` for development guidance

---

Built with ❤️ using Solidity, Hardhat, Next.js, and ethers.js
