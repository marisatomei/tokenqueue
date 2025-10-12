# TokenQueue Implementation Plan

## Overview
This plan outlines the complete implementation of the TokenQueue decentralized waiting list system, from smart contracts to frontend DApp.

## Contract Architecture

The system uses **three separate smart contracts**:

1. **WaitToken.sol** - ERC20 token contract
   - Pure token implementation
   - Minting controlled by TokenSale contract

2. **TokenSale.sol** - Token purchase contract
   - Handles tBNB payments
   - Implements bonus system
   - Mints tokens to buyers

3. **WaitingList.sol** - Queue management contract
   - Manages waiting queue
   - Handles queue operations (join/leave/remove)
   - Controls token deposits/refunds

### Contract Interaction Flow

```
User Flow 1: Buying Tokens
User → TokenSale.buyToken() [pays 0.01 tBNB]
     → TokenSale calculates bonus
     → TokenSale.mint() → WaitToken [mints tokens to user]

User Flow 2: Joining Queue
User → WaitToken.approve(WaitingList, 1 token)
     → WaitingList.joinQueue()
     → WaitToken.transferFrom(user, WaitingList, 1 token)
     → User added to queue

User Flow 3: Leaving Queue (Voluntary)
User → WaitingList.leaveQueue()
     → WaitToken.transfer(user, 0.5 tokens) [refund]
     → 0.5 tokens remain in WaitingList [penalty]

Admin Flow: Removing First User
Admin → WaitingList.removeFirst()
      → WaitToken.transfer(firstUser, 1 token) [full refund]
      → First user removed from queue
```

---

## Phase 1: Smart Contract Development

### 1.1 Create WaitToken.sol Contract
**File**: `contracts/WaitToken.sol`

**Requirements**:
- Pure ERC20 token implementation
- Inherit from OpenZeppelin's ERC20
- Token name: "WaitToken"
- Token symbol: "WAIT"
- Decimals: 18 (standard)

**Functions to Implement**:

1. **Constructor**
   - Initialize ERC20 with name and symbol
   - No initial mint (tokens created via TokenSale contract)

2. **`mint(address to, uint256 amount)` external**
   - Only callable by TokenSale contract
   - Mint new tokens to specified address

**State Variables**:
```solidity
- address public tokenSaleContract
- modifier onlyTokenSale
```

**Security Considerations**:
- Only TokenSale contract can mint tokens
- Standard ERC20 security (OpenZeppelin implementation)

---

### 1.2 Create TokenSale.sol Contract
**File**: `contracts/TokenSale.sol`

**Requirements**:
- Manages token sales with bonus system
- Interacts with WaitToken contract to mint tokens
- Collects tBNB payments

**State Variables**:
```solidity
- WaitToken public waitToken
- uint256 public constant TOKEN_PRICE = 0.01 ether
- address public owner
```

**Functions to Implement**:

1. **Constructor(address _waitTokenAddress)**
   - Store WaitToken contract address
   - Set owner

2. **`buyToken()` payable**
   - Accept tBNB payment (must be exactly 0.01 tBNB)
   - Check buyer's current WaitToken balance
   - Calculate tokens to mint: 1 + (current balance as bonus)
   - Call waitToken.mint() to mint tokens to buyer
   - Emit `TokenPurchased(address buyer, uint256 amount)`

3. **`withdrawFunds()` onlyOwner**
   - Allow owner to withdraw accumulated tBNB from token sales

**Events**:
```solidity
event TokenPurchased(address indexed buyer, uint256 amount);
```

---

### 1.3 Create WaitingList.sol Contract (Upgradeable with Proxy Pattern)
**File**: `contracts/WaitingList.sol`

**Requirements**:
- Manages the waiting queue
- Handles token deposits/refunds
- Admin controls for queue management
- **Upgradeable using UUPS Proxy Pattern** (OpenZeppelin)

**Inheritance**:
```solidity
- Initializable (OpenZeppelin)
- UUPSUpgradeable (OpenZeppelin)
- ReentrancyGuardUpgradeable (OpenZeppelin)
- OwnableUpgradeable (OpenZeppelin) - for admin control
```

**State Variables**:
```solidity
- WaitToken public waitToken
- mapping(address => bool) public isInQueue
- mapping(address => uint256) public queuePositions
- address[] private queue
- uint256 public constant REGISTRATION_COST = 1 ether (in token units, 1 WaitToken)
```

**Functions to Implement**:

1. **`initialize(address _waitTokenAddress)` initializer**
   - Replaces constructor for proxy pattern
   - Initialize all parent contracts
   - Store WaitToken contract address
   - Set admin/owner to msg.sender
   - Can only be called once

2. **`joinQueue()` external**
   - Check user has at least 1 WaitToken
   - Check user is not already in queue
   - Transfer 1 WaitToken from user to this contract (using transferFrom)
   - Add user to queue array
   - Set isInQueue[user] = true
   - Set queuePositions[user] = queue.length
   - Emit `UserRegistered(address user, uint256 position)`

3. **`removeFirst()` onlyAdmin**
   - Check queue is not empty
   - Get first user in queue
   - Remove from queue (shift array or maintain index)
   - Transfer 1 WaitToken back to removed user
   - Update isInQueue and queuePositions for remaining users
   - Emit `UserRemoved(address user)`

4. **`leaveQueue()` external**
   - Check user is in queue
   - Remove user from queue
   - Transfer 0.5 WaitToken back to user
   - Keep 0.5 WaitToken in contract (penalty)
   - Update isInQueue and queuePositions for remaining users
   - Emit `UserWithdrew(address user, uint256 refundAmount)`

5. **`getMyPosition()` view returns (uint256)**
   - Check if msg.sender is in queue
   - Return their position (1-indexed for user friendliness)
   - Revert if not in queue with clear error message

6. **`getQueueLength()` view returns (uint256)**
   - Return total number of users in queue

7. **`getQueueAtIndex(uint256 index)` view returns (address)**
   - Helper function for admin to see queue
   - Returns address at specific index

8. **`_authorizeUpgrade(address newImplementation)` internal override onlyOwner**
   - Required by UUPSUpgradeable
   - Only owner can authorize upgrades
   - Ensures upgrade security

**Events**:
```solidity
event UserRegistered(address indexed user, uint256 position);
event UserRemoved(address indexed user);
event UserWithdrew(address indexed user, uint256 refundAmount);
```

**Proxy Pattern Considerations**:
- Use `initialize()` instead of constructor
- All parent contracts must be upgradeable versions (*Upgradeable suffix)
- Never use `selfdestruct` or `delegatecall` in implementation
- Be careful with storage layout in upgrades (append only, no reordering)
- State variables must maintain same order for future upgrades
- Use storage gaps for future-proofing

**Security Considerations**:
- Use ReentrancyGuardUpgradeable from OpenZeppelin
- Proper access control via OwnableUpgradeable
- Only owner can upgrade contract
- Input validation (check values, addresses)
- Handle queue array updates carefully to avoid gas issues
- Safe math (built into Solidity 0.8.x)
- Prevent reinitialization attacks

---

## Phase 2: Deployment Scripts

### 2.1 Create Deploy Script
**File**: `scripts/deploy.js`

**Deployment Order** (important for dependencies):
1. Deploy WaitToken contract
2. Deploy TokenSale contract (pass WaitToken address)
3. Set TokenSale as minter in WaitToken contract
4. **Deploy WaitingList with Proxy Pattern:**
   - Deploy WaitingList implementation contract
   - Deploy ERC1967Proxy pointing to implementation
   - Call `initialize()` through proxy with WaitToken address
   - Get proxy address (this is the address users interact with)
5. Log all deployment addresses (including proxy and implementation)
6. Save ABIs to `src/utils/abis.js`
7. Save contract addresses to `src/constants/config.js` (use proxy address for WaitingList)
8. Verify deployment by calling initial functions

**Proxy Deployment Pattern**:
```javascript
// Deploy implementation
const WaitingList = await ethers.getContractFactory("WaitingList");
const waitingListImpl = await WaitingList.deploy();
await waitingListImpl.waitForDeployment();

// Deploy proxy
const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
const initData = waitingListImpl.interface.encodeFunctionData(
  "initialize",
  [waitTokenAddress]
);
const proxy = await ERC1967Proxy.deploy(
  await waitingListImpl.getAddress(),
  initData
);
await proxy.waitForDeployment();

// Get proxy contract instance
const waitingList = WaitingList.attach(await proxy.getAddress());
```

**Generated Files Format**:

`src/utils/abis.js`:
```javascript
export const WAIT_TOKEN_ABI = [...];
export const TOKEN_SALE_ABI = [...];
export const WAITING_LIST_ABI = [...];
```

`src/constants/config.js`:
```javascript
export const CONTRACTS = {
  waitToken: {
    address: "0x...",
    chainId: 31337
  },
  tokenSale: {
    address: "0x...",
    chainId: 31337
  },
  waitingList: {
    address: "0x...",  // Proxy address (users interact with this)
    implementationAddress: "0x...",  // Implementation address (for reference)
    chainId: 31337
  }
};
```

**Important**: Frontend should only interact with the proxy address, never the implementation directly.

### 2.2 Create Testnet Deploy Script (Optional)
**File**: `scripts/deploy-testnet.js`
- Same as deploy.js but for BSC Testnet
- Use different config output for testnet addresses

---

## Phase 3: Smart Contract Testing

### 3.1 Create Test Suite for WaitToken
**File**: `test/WaitToken.test.js`

**Test Cases**:
1. **Deployment Tests**
   - Contract deploys successfully
   - Name and symbol are correct
   - Initial supply is 0

2. **Minting Tests**
   - TokenSale contract can mint tokens
   - Non-authorized addresses cannot mint
   - Mint events emitted correctly

### 3.2 Create Test Suite for TokenSale
**File**: `test/TokenSale.test.js`

**Test Cases**:
1. **Deployment Tests**
   - Contract deploys successfully
   - WaitToken address stored correctly
   - Owner is set correctly

2. **Token Purchase Tests**
   - Can buy tokens with exactly 0.01 tBNB
   - Receives 1 token on first purchase
   - Receives bonus tokens on subsequent purchases (1 + balance)
   - Cannot buy with wrong amount (too little/too much)
   - Tokens minted to buyer's address
   - Event emitted correctly with correct amount

3. **Owner Functions**
   - Owner can withdraw accumulated tBNB
   - Non-owner cannot withdraw

### 3.3 Create Test Suite for WaitingList (Proxy)
**File**: `test/WaitingList.test.js`

**Test Cases**:
1. **Proxy Deployment Tests**
   - Implementation contract deploys successfully
   - Proxy deploys successfully
   - Initialization through proxy works
   - WaitToken address stored correctly
   - Owner/Admin is set correctly
   - Cannot initialize twice (reinitialization protection)
   - Proxy points to correct implementation

2. **Queue Join Tests**
   - User must approve WaitingList to spend tokens first
   - Can join queue with 1 WaitToken
   - Token transferred to WaitingList contract
   - Position assigned correctly (1, 2, 3...)
   - Cannot join if already in queue
   - Cannot join without sufficient tokens
   - Cannot join without approval
   - Event emitted correctly

3. **Queue Management Tests (Admin)**
   - Admin can remove first user
   - User receives 1 token refund
   - Queue updates correctly (positions shift)
   - Non-admin cannot remove
   - Cannot remove from empty queue
   - Event emitted correctly
   - Multiple removals work correctly

4. **Voluntary Withdrawal Tests**
   - User can leave queue
   - Receives exactly 0.5 token refund
   - Contract keeps 0.5 token
   - Queue updates correctly
   - Positions shift for remaining users
   - Cannot withdraw if not in queue
   - Event emitted correctly

5. **Position Query Tests**
   - Returns correct position for user in queue (1-indexed)
   - Reverts for user not in queue with clear message
   - Position updates correctly after removals
   - Position updates correctly after withdrawals

6. **Queue View Functions**
   - getQueueLength returns correct count
   - getQueueAtIndex returns correct addresses

7. **Upgradeability Tests**
   - Owner can upgrade to new implementation
   - Non-owner cannot upgrade
   - State persists after upgrade (queue data maintained)
   - New implementation functions work correctly
   - Old functions still work after upgrade

8. **Integration Tests**
   - Full flow: buy tokens → approve → join queue → check position
   - Multiple users in queue simultaneously
   - Removing middle users updates positions correctly
   - User buying more tokens after joining queue
   - Complex scenarios with mix of joins/leaves/removes
   - All operations work through proxy correctly

---

## Phase 4: Frontend DApp Implementation

### 4.1 Setup Frontend Structure
**Create directories**:
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions (+ generated abis.js)
- `src/constants/` - Constants (+ generated config.js)

### 4.2 Create Web3 Context
**File**: `src/contexts/Web3Context.js`

**State to manage**:
- Wallet connection status
- Current account address
- Provider and signer
- Network/chainId
- Contract instances (waitToken, tokenSale, waitingList)

**Functions**:
- `connectWallet()` - Connect to MetaMask
- `disconnectWallet()` - Disconnect wallet
- `switchNetwork()` - Switch to correct network
- `getContracts()` - Initialize all three contract instances

### 4.3 Create Custom Hooks

**File**: `src/hooks/useTokenSale.js`
- `buyTokens()` - Buy tokens via TokenSale contract
- `getTokenBalance()` - Get user's WaitToken balance

**File**: `src/hooks/useWaitingList.js`
- `approveTokens(amount)` - Approve WaitingList to spend tokens
- `joinQueue()` - Join waiting list (requires prior approval)
- `leaveQueue()` - Leave waiting list
- `getMyPosition()` - Get user position
- `removeFirst()` - Admin remove first user
- `getQueueLength()` - Get total queue size
- `isInQueue(address)` - Check if user is in queue

**File**: `src/hooks/useContractEvents.js`
- Listen to all contract events:
  - TokenSale: TokenPurchased
  - WaitingList: UserRegistered, UserRemoved, UserWithdrew
- Update UI in real-time
- Maintain event history for user feedback

### 4.4 Create UI Components

**File**: `src/components/WalletConnect.js`
- Connect/Disconnect button
- Display connected address (truncated)
- Network status indicator
- Follow design from index.html

**File**: `src/components/TokenBalance.js`
- Display user's WaitToken balance
- Refresh on transactions

**File**: `src/components/BuyTokens.js`
- Input for number of purchases (optional)
- Buy button (sends 0.01 tBNB)
- Transaction status
- Success/error messages

**File**: `src/components/QueueStatus.js`
- Display user's position in queue
- Show "Not in queue" if applicable
- Display total queue length
- Real-time updates

**File**: `src/components/QueueActions.js`
- Join Queue button (requires 1 token)
- Leave Queue button (only if in queue)
- Admin Remove First button (only for admin)
- Transaction loading states

**File**: `src/components/TransactionStatus.js`
- Display pending transactions
- Show success/error messages
- Display transaction hash with link to explorer

### 4.5 Update Main Page
**File**: `src/app/page.js`

**Structure**:
- Use 'use client' directive
- Wrap app with Web3Provider
- Header with WalletConnect component
- Main content area with:
  - Token balance display
  - Buy tokens section
  - Queue status display
  - Queue action buttons (join/leave/admin)
  - Transaction status
- Follow styling from index.html exactly

**Features**:
- Responsive design
- Dark mode support
- Loading states
- Error handling with ethers-decode-error
- Real-time updates via events

### 4.6 Create Utility Functions
**File**: `src/utils/web3.js`
- Format addresses (truncate)
- Format token amounts
- Parse blockchain errors
- Network helpers

**File**: `src/utils/constants.js`
- Network configurations
- RPC URLs
- Block explorer URLs

---

## Phase 5: Integration & Testing

### 5.1 Local Testing
1. Start Hardhat node: `npm run docker:up`
2. Deploy contracts: `npm run hardhat:deploy`
3. Verify files synced: `src/utils/abis.js` and `src/constants/config.js`
4. Start frontend: `npm run dev`
5. Configure MetaMask:
   - Network: Localhost
   - RPC: http://127.0.0.1:8545
   - ChainId: 31337
   - Import test account from Hardhat

### 5.2 Full Workflow Testing
1. Connect wallet
2. Buy tokens (test bonus calculation)
3. Join queue
4. Check position
5. Test admin remove (with admin account)
6. Test voluntary leave
7. Verify all events and UI updates

### 5.3 Error Handling Testing
- Test MetaMask rejection
- Test insufficient funds
- Test wrong network
- Test already in queue
- Test not in queue errors

---

## Phase 6: Documentation & Polish

### 6.1 Code Documentation
- Add JSDoc comments to all functions
- Document component props
- Add inline comments for complex logic

### 6.2 User Documentation
- Update README.md with setup instructions
- Add screenshots/demo video
- Document MetaMask setup

### 6.3 UI/UX Polish
- Add loading spinners
- Toast notifications for transactions
- Smooth transitions
- Error messages user-friendly
- Success confirmations

---

## Implementation Order

**Priority 1 - Core Functionality** (Required for MVP):
1. WaitToken.sol contract with all functions
2. deploy.js script with file generation
3. Basic contract tests
4. Web3Context setup
5. Main page.js with all features
6. Essential components (WalletConnect, BuyTokens, QueueActions)

**Priority 2 - Testing & Polish**:
7. Comprehensive test suite
8. Error handling improvements
9. UI/UX enhancements
10. Code documentation

**Priority 3 - Advanced Features** (Future):
11. Event listening and real-time updates
12. Transaction history
13. BSC Testnet deployment
14. Advanced admin features

---

## Technical Decisions

### Queue Data Structure
**Decision**: Use dynamic array `address[]` for queue
**Rationale**: Simple FIFO implementation, acceptable gas costs for educational project
**Alternative**: Could use linked list pattern for O(1) removals at scale

### Contract Architecture
**Decision**: Three separate contracts (WaitToken, TokenSale, WaitingList)
**Rationale**:
- Separation of concerns (token vs sales vs queue logic)
- Easier to test each component independently
- More modular and maintainable
- Follows single responsibility principle
**Alternative**: Single monolithic contract (less maintainable)

### Token Minting
**Decision**: Only TokenSale can mint tokens
**Rationale**: Centralized minting control, prevents unauthorized token creation
**Flow**: User pays tBNB → TokenSale → mints via WaitToken

### Token Transfer Method
**Decision**: Use `transferFrom()` with user approval for joining queue
**Rationale**: Standard ERC20 pattern, secure, explicit user consent
**Flow**: User approves WaitingList → calls joinQueue() → WaitingList transfers tokens
**Alternative**: Could have users send tokens directly (less explicit)

### Frontend State Management
**Decision**: React Context API for Web3 state
**Rationale**: Sufficient for single-page app, no external dependencies needed
**Alternative**: Could use Redux/Zustand for complex state

### Real-time Updates
**Decision**: Contract event listeners
**Rationale**: Efficient, real-time, blockchain-native
**Alternative**: Polling (less efficient)

---

## Success Criteria

**Smart Contracts**:
- ✓ WaitToken: ERC20 compliant with controlled minting
- ✓ TokenSale: Purchases work with correct bonus calculation
- ✓ WaitingList: All queue operations functional
- ✓ All 7 requirements from SPECIFICATION.md implemented
- ✓ Tests pass with >90% coverage for each contract
- ✓ No security vulnerabilities
- ✓ Proper access control (only TokenSale mints, only admin removes)
- ✓ Deploys successfully to Hardhat and BSC Testnet
- ✓ Contract interactions work correctly (approve → transfer flow)

**Frontend**:
- ✓ MetaMask connection works
- ✓ Can interact with all three contracts
- ✓ Approve + Join Queue flow works seamlessly
- ✓ Buy tokens functional with bonus display
- ✓ Queue actions work (join/leave/admin remove)
- ✓ Token balance updates in real-time
- ✓ Position tracking accurate
- ✓ Admin controls only visible to admin
- ✓ UI matches index.html design
- ✓ Error handling comprehensive (decode with ethers-decode-error)
- ✓ Responsive on mobile/desktop

**Integration**:
- ✓ Full user flow works end-to-end:
  1. Connect wallet
  2. Buy tokens (multiple times to test bonus)
  3. Approve WaitingList to spend tokens
  4. Join queue
  5. Check position
  6. Admin can remove first user
  7. User can voluntarily leave
- ✓ Events update UI in real-time across all contracts
- ✓ Works on local Hardhat network
- ✓ Ready for BSC Testnet deployment

---

## Estimated Timeline

**Phase 1** (Smart Contract): 2-3 hours
**Phase 2** (Deploy Scripts): 1 hour
**Phase 3** (Testing): 2-3 hours
**Phase 4** (Frontend): 4-5 hours
**Phase 5** (Integration): 1-2 hours
**Phase 6** (Polish): 1-2 hours

**Total**: 11-16 hours of development time

---

## Next Steps

After approval of this plan:
1. Create `contracts/` and `test/` directories
2. Implement smart contracts:
   - WaitToken.sol (ERC20 token)
   - TokenSale.sol (token purchase with bonus)
   - WaitingList.sol (queue management)
3. Create deployment script (deploy.js) with proper order
4. Build comprehensive test suites for each contract
5. Develop frontend structure:
   - Web3Context
   - Custom hooks for each contract
   - UI components following index.html design
6. Integration testing (full user flows)
7. Final polish and documentation
