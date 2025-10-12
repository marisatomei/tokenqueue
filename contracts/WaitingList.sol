// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./WaitToken.sol";

/**
 * @title WaitingList
 * @dev Manages a FIFO waiting queue using WaitToken for registration
 * Upgradeable contract using UUPS proxy pattern
 */
contract WaitingList is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    WaitToken public waitToken;

    // Queue management
    mapping(address => bool) public isInQueue;
    mapping(address => uint256) private queuePositions; // 0-indexed position in array
    address[] private queue;

    uint256 public constant REGISTRATION_COST = 1 ether; // 1 WaitToken (18 decimals)
    uint256 public constant WITHDRAWAL_REFUND = 0.5 ether; // 0.5 WaitToken refund

    event UserRegistered(address indexed user, uint256 position);
    event UserRemoved(address indexed user);
    event UserWithdrew(address indexed user, uint256 refundAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract (replaces constructor for upgradeable contracts)
     * @param _waitTokenAddress Address of the WaitToken contract
     */
    function initialize(address _waitTokenAddress) public initializer {
        require(_waitTokenAddress != address(0), "WaitingList: Invalid WaitToken address");

        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        waitToken = WaitToken(_waitTokenAddress);
    }

    /**
     * @dev Allows a user to join the waiting queue
     * User must have approved this contract to spend at least 1 WaitToken
     * User must not already be in the queue
     */
    function joinQueue() external nonReentrant {
        require(!isInQueue[msg.sender], "WaitingList: Already in queue");
        require(
            waitToken.balanceOf(msg.sender) >= REGISTRATION_COST,
            "WaitingList: Insufficient token balance"
        );

        // Transfer 1 WaitToken from user to this contract
        require(
            waitToken.transferFrom(msg.sender, address(this), REGISTRATION_COST),
            "WaitingList: Token transfer failed"
        );

        // Add user to queue
        queuePositions[msg.sender] = queue.length;
        queue.push(msg.sender);
        isInQueue[msg.sender] = true;

        // Emit event with 1-indexed position for user friendliness
        emit UserRegistered(msg.sender, queue.length);
    }

    /**
     * @dev Admin function to remove the first user from the queue
     * Refunds 1 WaitToken to the removed user
     */
    function removeFirst() external onlyOwner nonReentrant {
        require(queue.length > 0, "WaitingList: Queue is empty");

        address userToRemove = queue[0];

        // Remove from queue and update mappings
        _removeFromQueue(0);

        // Refund full registration cost (1 WaitToken)
        require(
            waitToken.transfer(userToRemove, REGISTRATION_COST),
            "WaitingList: Token refund failed"
        );

        emit UserRemoved(userToRemove);
    }

    /**
     * @dev Allows a user to voluntarily leave the queue
     * Receives 0.5 WaitToken refund, 0.5 WaitToken stays in contract as penalty
     */
    function leaveQueue() external nonReentrant {
        require(isInQueue[msg.sender], "WaitingList: Not in queue");

        uint256 userPosition = queuePositions[msg.sender];

        // Remove from queue
        _removeFromQueue(userPosition);

        // Refund 0.5 WaitToken (half of registration cost)
        require(
            waitToken.transfer(msg.sender, WITHDRAWAL_REFUND),
            "WaitingList: Token refund failed"
        );

        emit UserWithdrew(msg.sender, WITHDRAWAL_REFUND);
    }

    /**
     * @dev Returns the caller's position in the queue (1-indexed)
     * Reverts if caller is not in queue
     * @return position The user's position (1 = first in line)
     */
    function getMyPosition() external view returns (uint256) {
        require(isInQueue[msg.sender], "WaitingList: Not in queue");
        return queuePositions[msg.sender] + 1; // Return 1-indexed position
    }

    /**
     * @dev Returns the total number of users in the queue
     * @return length Total queue size
     */
    function getQueueLength() external view returns (uint256) {
        return queue.length;
    }

    /**
     * @dev Returns the address at a specific index in the queue (admin function)
     * @param index 0-indexed position in queue
     * @return address Address at the specified position
     */
    function getQueueAtIndex(uint256 index) external view returns (address) {
        require(index < queue.length, "WaitingList: Index out of bounds");
        return queue[index];
    }

    /**
     * @dev Internal function to remove a user from the queue
     * Updates all affected positions
     * @param index 0-indexed position of user to remove
     */
    function _removeFromQueue(uint256 index) private {
        require(index < queue.length, "WaitingList: Index out of bounds");

        address userToRemove = queue[index];

        // Remove user from mappings
        isInQueue[userToRemove] = false;
        delete queuePositions[userToRemove];

        // Shift queue array elements
        for (uint256 i = index; i < queue.length - 1; i++) {
            queue[i] = queue[i + 1];
            queuePositions[queue[i]] = i; // Update positions for shifted users
        }

        // Remove last element
        queue.pop();
    }

    /**
     * @dev Required by UUPSUpgradeable - authorizes contract upgrades
     * Only owner can upgrade the contract
     * @param newImplementation Address of the new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Returns the current implementation version
     * Useful for tracking upgrades
     * @return version Version string
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
