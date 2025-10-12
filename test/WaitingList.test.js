const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("WaitingList", function () {
  let waitToken;
  let tokenSale;
  let waitingList;
  let waitingListImpl;
  let owner;
  let user1;
  let user2;
  let user3;
  const REGISTRATION_COST = ethers.parseEther("1");
  const WITHDRAWAL_REFUND = ethers.parseEther("0.5");
  const TOKEN_PRICE = ethers.parseEther("0.01");

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy WaitToken
    const WaitToken = await ethers.getContractFactory("WaitToken");
    waitToken = await WaitToken.deploy();
    await waitToken.waitForDeployment();

    // Deploy TokenSale
    const TokenSale = await ethers.getContractFactory("TokenSale");
    tokenSale = await TokenSale.deploy(await waitToken.getAddress());
    await tokenSale.waitForDeployment();

    // Set TokenSale as minter
    await waitToken.setTokenSaleContract(await tokenSale.getAddress());

    // Deploy WaitingList with UUPS proxy using upgrades plugin
    const WaitingList = await ethers.getContractFactory("WaitingList");
    waitingList = await upgrades.deployProxy(
      WaitingList,
      [await waitToken.getAddress()],
      { kind: "uups" }
    );
    await waitingList.waitForDeployment();

    // Get implementation address for verification
    waitingListImpl = await upgrades.erc1967.getImplementationAddress(
      await waitingList.getAddress()
    );
  });

  describe("Proxy Deployment", function () {
    it("Should deploy implementation successfully", async function () {
      expect(waitingListImpl).to.be.properAddress;
    });

    it("Should deploy proxy successfully", async function () {
      expect(await waitingList.getAddress()).to.be.properAddress;
    });

    it("Should initialize through proxy correctly", async function () {
      expect(await waitingList.waitToken()).to.equal(await waitToken.getAddress());
      expect(await waitingList.owner()).to.equal(owner.address);
    });

    it("Should have correct version", async function () {
      expect(await waitingList.version()).to.equal("1.0.0");
    });

    it("Should have correct constants", async function () {
      expect(await waitingList.REGISTRATION_COST()).to.equal(REGISTRATION_COST);
      expect(await waitingList.WITHDRAWAL_REFUND()).to.equal(WITHDRAWAL_REFUND);
    });

    it("Should not allow reinitialization", async function () {
      await expect(
        waitingList.initialize(await waitToken.getAddress())
      ).to.be.revertedWithCustomError(waitingList, "InvalidInitialization");
    });

    it("Should reject initialization with zero address", async function () {
      const WaitingList = await ethers.getContractFactory("WaitingList");

      await expect(
        upgrades.deployProxy(WaitingList, [ethers.ZeroAddress], { kind: "uups" })
      ).to.be.revertedWith("WaitingList: Invalid WaitToken address");
    });
  });

  describe("Join Queue", function () {
    beforeEach(async function () {
      // Give users some tokens
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user2).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user3).buyToken({ value: TOKEN_PRICE });
    });

    it("Should allow user to join queue with token approval", async function () {
      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user1).joinQueue();

      expect(await waitingList.isInQueue(user1.address)).to.be.true;
      expect(await waitingList.getQueueLength()).to.equal(1);
    });

    it("Should emit UserRegistered event with correct position", async function () {
      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);

      await expect(waitingList.connect(user1).joinQueue())
        .to.emit(waitingList, "UserRegistered")
        .withArgs(user1.address, 1); // 1-indexed position
    });

    it("Should transfer 1 token from user to contract", async function () {
      const userBalanceBefore = await waitToken.balanceOf(user1.address);
      const contractBalanceBefore = await waitToken.balanceOf(await waitingList.getAddress());

      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user1).joinQueue();

      expect(await waitToken.balanceOf(user1.address)).to.equal(
        userBalanceBefore - REGISTRATION_COST
      );
      expect(await waitToken.balanceOf(await waitingList.getAddress())).to.equal(
        contractBalanceBefore + REGISTRATION_COST
      );
    });

    it("Should assign positions correctly for multiple users", async function () {
      // User1 joins (position 1)
      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user1).joinQueue();

      // User2 joins (position 2)
      await waitToken.connect(user2).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user2).joinQueue();

      // User3 joins (position 3)
      await waitToken.connect(user3).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user3).joinQueue();

      expect(await waitingList.getQueueLength()).to.equal(3);
      expect(await waitingList.getQueueAtIndex(0)).to.equal(user1.address);
      expect(await waitingList.getQueueAtIndex(1)).to.equal(user2.address);
      expect(await waitingList.getQueueAtIndex(2)).to.equal(user3.address);
    });

    it("Should reject joining if already in queue", async function () {
      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user1).joinQueue();

      // Try to join again
      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await expect(waitingList.connect(user1).joinQueue()).to.be.revertedWith(
        "WaitingList: Already in queue"
      );
    });

    it("Should reject joining without sufficient token balance", async function () {
      // User with no tokens
      await expect(waitingList.connect(owner).joinQueue()).to.be.revertedWith(
        "WaitingList: Insufficient token balance"
      );
    });

    it("Should reject joining without approval", async function () {
      // No approval given
      await expect(waitingList.connect(user1).joinQueue()).to.be.reverted;
    });

    it("Should reject joining with insufficient approval", async function () {
      const insufficientApproval = ethers.parseEther("0.5");
      await waitToken.connect(user1).approve(await waitingList.getAddress(), insufficientApproval);

      await expect(waitingList.connect(user1).joinQueue()).to.be.reverted;
    });
  });

  describe("Get My Position", function () {
    beforeEach(async function () {
      // Give users tokens and add them to queue
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user2).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user3).buyToken({ value: TOKEN_PRICE });

      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user1).joinQueue();

      await waitToken.connect(user2).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user2).joinQueue();

      await waitToken.connect(user3).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user3).joinQueue();
    });

    it("Should return correct position for users in queue (1-indexed)", async function () {
      expect(await waitingList.connect(user1).getMyPosition()).to.equal(1);
      expect(await waitingList.connect(user2).getMyPosition()).to.equal(2);
      expect(await waitingList.connect(user3).getMyPosition()).to.equal(3);
    });

    it("Should revert for user not in queue", async function () {
      await expect(waitingList.connect(owner).getMyPosition()).to.be.revertedWith(
        "WaitingList: Not in queue"
      );
    });
  });

  describe("Admin Remove First", function () {
    beforeEach(async function () {
      // Setup queue with 3 users
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user2).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user3).buyToken({ value: TOKEN_PRICE });

      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user1).joinQueue();

      await waitToken.connect(user2).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user2).joinQueue();

      await waitToken.connect(user3).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user3).joinQueue();
    });

    it("Should allow owner to remove first user", async function () {
      const user1BalanceBefore = await waitToken.balanceOf(user1.address);

      await waitingList.connect(owner).removeFirst();

      expect(await waitingList.isInQueue(user1.address)).to.be.false;
      expect(await waitingList.getQueueLength()).to.equal(2);
      expect(await waitToken.balanceOf(user1.address)).to.equal(
        user1BalanceBefore + REGISTRATION_COST
      );
    });

    it("Should emit UserRemoved event", async function () {
      await expect(waitingList.connect(owner).removeFirst())
        .to.emit(waitingList, "UserRemoved")
        .withArgs(user1.address);
    });

    it("Should update positions correctly after removal", async function () {
      await waitingList.connect(owner).removeFirst();

      // User2 should now be first (position 1)
      expect(await waitingList.connect(user2).getMyPosition()).to.equal(1);
      // User3 should be second (position 2)
      expect(await waitingList.connect(user3).getMyPosition()).to.equal(2);
      expect(await waitingList.getQueueAtIndex(0)).to.equal(user2.address);
      expect(await waitingList.getQueueAtIndex(1)).to.equal(user3.address);
    });

    it("Should allow multiple sequential removals", async function () {
      await waitingList.connect(owner).removeFirst(); // Remove user1
      await waitingList.connect(owner).removeFirst(); // Remove user2
      await waitingList.connect(owner).removeFirst(); // Remove user3

      expect(await waitingList.getQueueLength()).to.equal(0);
    });

    it("Should refund full token amount (1 token)", async function () {
      const user1BalanceBefore = await waitToken.balanceOf(user1.address);

      await waitingList.connect(owner).removeFirst();

      expect(await waitToken.balanceOf(user1.address)).to.equal(
        user1BalanceBefore + REGISTRATION_COST
      );
    });

    it("Should reject removal from non-owner", async function () {
      await expect(waitingList.connect(user1).removeFirst()).to.be.revertedWithCustomError(
        waitingList,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should reject removal from empty queue", async function () {
      // Remove all users
      await waitingList.connect(owner).removeFirst();
      await waitingList.connect(owner).removeFirst();
      await waitingList.connect(owner).removeFirst();

      await expect(waitingList.connect(owner).removeFirst()).to.be.revertedWith(
        "WaitingList: Queue is empty"
      );
    });
  });

  describe("Leave Queue (Voluntary)", function () {
    beforeEach(async function () {
      // Setup queue
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user2).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user3).buyToken({ value: TOKEN_PRICE });

      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user1).joinQueue();

      await waitToken.connect(user2).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user2).joinQueue();

      await waitToken.connect(user3).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user3).joinQueue();
    });

    it("Should allow user to leave queue", async function () {
      const user2BalanceBefore = await waitToken.balanceOf(user2.address);

      await waitingList.connect(user2).leaveQueue();

      expect(await waitingList.isInQueue(user2.address)).to.be.false;
      expect(await waitingList.getQueueLength()).to.equal(2);
      expect(await waitToken.balanceOf(user2.address)).to.equal(
        user2BalanceBefore + WITHDRAWAL_REFUND
      );
    });

    it("Should emit UserWithdrew event with refund amount", async function () {
      await expect(waitingList.connect(user2).leaveQueue())
        .to.emit(waitingList, "UserWithdrew")
        .withArgs(user2.address, WITHDRAWAL_REFUND);
    });

    it("Should refund only 0.5 tokens (half)", async function () {
      const user1BalanceBefore = await waitToken.balanceOf(user1.address);

      await waitingList.connect(user1).leaveQueue();

      expect(await waitToken.balanceOf(user1.address)).to.equal(
        user1BalanceBefore + WITHDRAWAL_REFUND
      );
    });

    it("Should keep 0.5 tokens in contract as penalty", async function () {
      const contractBalanceBefore = await waitToken.balanceOf(await waitingList.getAddress());

      await waitingList.connect(user1).leaveQueue();

      expect(await waitToken.balanceOf(await waitingList.getAddress())).to.equal(
        contractBalanceBefore - WITHDRAWAL_REFUND
      );
    });

    it("Should update positions correctly after leaving", async function () {
      // User2 leaves (was in position 2)
      await waitingList.connect(user2).leaveQueue();

      // User1 still in position 1
      expect(await waitingList.connect(user1).getMyPosition()).to.equal(1);
      // User3 moves to position 2 (was 3)
      expect(await waitingList.connect(user3).getMyPosition()).to.equal(2);
    });

    it("Should allow first user to leave", async function () {
      await waitingList.connect(user1).leaveQueue();

      expect(await waitingList.isInQueue(user1.address)).to.be.false;
      expect(await waitingList.connect(user2).getMyPosition()).to.equal(1);
      expect(await waitingList.connect(user3).getMyPosition()).to.equal(2);
    });

    it("Should allow last user to leave", async function () {
      await waitingList.connect(user3).leaveQueue();

      expect(await waitingList.isInQueue(user3.address)).to.be.false;
      expect(await waitingList.getQueueLength()).to.equal(2);
    });

    it("Should reject leaving if not in queue", async function () {
      await expect(waitingList.connect(owner).leaveQueue()).to.be.revertedWith(
        "WaitingList: Not in queue"
      );
    });

    it("Should reject leaving twice", async function () {
      await waitingList.connect(user1).leaveQueue();

      await expect(waitingList.connect(user1).leaveQueue()).to.be.revertedWith(
        "WaitingList: Not in queue"
      );
    });
  });

  describe("Queue View Functions", function () {
    beforeEach(async function () {
      // Setup queue
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user2).buyToken({ value: TOKEN_PRICE });

      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user1).joinQueue();

      await waitToken.connect(user2).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user2).joinQueue();
    });

    it("Should return correct queue length", async function () {
      expect(await waitingList.getQueueLength()).to.equal(2);
    });

    it("Should return correct address at index", async function () {
      expect(await waitingList.getQueueAtIndex(0)).to.equal(user1.address);
      expect(await waitingList.getQueueAtIndex(1)).to.equal(user2.address);
    });

    it("Should reject getQueueAtIndex with out of bounds index", async function () {
      await expect(waitingList.getQueueAtIndex(10)).to.be.revertedWith(
        "WaitingList: Index out of bounds"
      );
    });
  });

  describe("Integration Tests", function () {
    it("Should handle full user flow: buy → approve → join → check position", async function () {
      // Buy tokens
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));

      // Approve WaitingList
      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);

      // Join queue
      await waitingList.connect(user1).joinQueue();
      expect(await waitingList.isInQueue(user1.address)).to.be.true;

      // Check position
      expect(await waitingList.connect(user1).getMyPosition()).to.equal(1);
    });

    it("Should handle multiple users joining, some leaving, some removed", async function () {
      // 3 users buy tokens and join
      for (const user of [user1, user2, user3]) {
        await tokenSale.connect(user).buyToken({ value: TOKEN_PRICE });
        await waitToken.connect(user).approve(await waitingList.getAddress(), REGISTRATION_COST);
        await waitingList.connect(user).joinQueue();
      }

      expect(await waitingList.getQueueLength()).to.equal(3);

      // User2 leaves voluntarily
      await waitingList.connect(user2).leaveQueue();
      expect(await waitingList.getQueueLength()).to.equal(2);
      expect(await waitingList.connect(user1).getMyPosition()).to.equal(1);
      expect(await waitingList.connect(user3).getMyPosition()).to.equal(2);

      // Admin removes first (user1)
      await waitingList.connect(owner).removeFirst();
      expect(await waitingList.getQueueLength()).to.equal(1);
      expect(await waitingList.connect(user3).getMyPosition()).to.equal(1);
    });

    it("Should allow user to buy more tokens after joining queue", async function () {
      // Buy and join
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user1).joinQueue();

      // User now has 0 tokens (transferred 1 to contract)
      expect(await waitToken.balanceOf(user1.address)).to.equal(0);

      // Buy more tokens (gets 1 + 0 bonus = 1 token)
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
    });
  });

  describe("Upgradeability", function () {
    it("Should allow owner to upgrade implementation", async function () {
      // Deploy new implementation using upgrades plugin
      const WaitingListV2 = await ethers.getContractFactory("WaitingList");
      const upgraded = await upgrades.upgradeProxy(await waitingList.getAddress(), WaitingListV2);

      // Verify it's still the same proxy address but upgraded
      expect(await upgraded.getAddress()).to.equal(await waitingList.getAddress());
      expect(await upgraded.version()).to.equal("1.0.0");
    });

    it("Should reject upgrade from non-owner", async function () {
      const WaitingListV2 = await ethers.getContractFactory("WaitingList", user1);

      await expect(
        upgrades.upgradeProxy(await waitingList.getAddress(), WaitingListV2)
      ).to.be.reverted;
    });

    it("Should preserve state after upgrade", async function () {
      // Add users to queue
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await waitToken.connect(user1).approve(await waitingList.getAddress(), REGISTRATION_COST);
      await waitingList.connect(user1).joinQueue();

      const queueLengthBefore = await waitingList.getQueueLength();
      const user1InQueueBefore = await waitingList.isInQueue(user1.address);

      // Upgrade to new implementation
      const WaitingListV2 = await ethers.getContractFactory("WaitingList");
      await upgrades.upgradeProxy(await waitingList.getAddress(), WaitingListV2);

      // Verify state is preserved
      expect(await waitingList.getQueueLength()).to.equal(queueLengthBefore);
      expect(await waitingList.isInQueue(user1.address)).to.equal(user1InQueueBefore);
    });
  });
});
