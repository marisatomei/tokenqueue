const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenSale", function () {
  let waitToken;
  let tokenSale;
  let owner;
  let user1;
  let user2;
  const TOKEN_PRICE = ethers.parseEther("0.01");
  const BASE_TOKEN_AMOUNT = ethers.parseEther("1");

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy WaitToken
    const WaitToken = await ethers.getContractFactory("WaitToken");
    waitToken = await WaitToken.deploy();
    await waitToken.waitForDeployment();

    // Deploy TokenSale
    const TokenSale = await ethers.getContractFactory("TokenSale");
    tokenSale = await TokenSale.deploy(await waitToken.getAddress());
    await tokenSale.waitForDeployment();

    // Set TokenSale as minter in WaitToken
    await waitToken.setTokenSaleContract(await tokenSale.getAddress());
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await tokenSale.getAddress()).to.be.properAddress;
    });

    it("Should store WaitToken address correctly", async function () {
      expect(await tokenSale.waitToken()).to.equal(await waitToken.getAddress());
    });

    it("Should set deployer as owner", async function () {
      expect(await tokenSale.owner()).to.equal(owner.address);
    });

    it("Should have correct TOKEN_PRICE constant", async function () {
      expect(await tokenSale.TOKEN_PRICE()).to.equal(TOKEN_PRICE);
    });

    it("Should have correct BASE_TOKEN_AMOUNT constant", async function () {
      expect(await tokenSale.BASE_TOKEN_AMOUNT()).to.equal(BASE_TOKEN_AMOUNT);
    });

    it("Should reject deployment with zero address", async function () {
      const TokenSale = await ethers.getContractFactory("TokenSale");
      await expect(TokenSale.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "TokenSale: Invalid WaitToken address"
      );
    });

    it("Should have zero balance initially", async function () {
      expect(await tokenSale.getBalance()).to.equal(0);
    });
  });

  describe("Token Purchase - First Time Buyers", function () {
    it("Should allow user to buy tokens with exact payment", async function () {
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });

      const balance = await waitToken.balanceOf(user1.address);
      expect(balance).to.equal(BASE_TOKEN_AMOUNT); // 1 token, no bonus yet
    });

    it("Should emit TokenPurchased event", async function () {
      await expect(tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE }))
        .to.emit(tokenSale, "TokenPurchased")
        .withArgs(user1.address, BASE_TOKEN_AMOUNT);
    });

    it("Should reject payment less than TOKEN_PRICE", async function () {
      const tooLittle = ethers.parseEther("0.005");

      await expect(
        tokenSale.connect(user1).buyToken({ value: tooLittle })
      ).to.be.revertedWith("TokenSale: Must send exactly 0.01 tBNB");
    });

    it("Should reject payment more than TOKEN_PRICE", async function () {
      const tooMuch = ethers.parseEther("0.02");

      await expect(
        tokenSale.connect(user1).buyToken({ value: tooMuch })
      ).to.be.revertedWith("TokenSale: Must send exactly 0.01 tBNB");
    });

    it("Should accumulate tBNB in contract", async function () {
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });

      expect(await tokenSale.getBalance()).to.equal(TOKEN_PRICE);
    });
  });

  describe("Token Purchase - Bonus System", function () {
    it("Should give bonus on second purchase (1 + 1 = 2 tokens)", async function () {
      // First purchase: get 1 token
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));

      // Second purchase: get 1 + 1 (bonus) = 2 tokens
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("3")); // 1 + 2
    });

    it("Should calculate bonus correctly for multiple purchases", async function () {
      // Purchase 1: 0 + 1 = 1 token (total: 1)
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));

      // Purchase 2: 1 + (1 + 1) = 1 + 2 = 3 tokens (total: 3)
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("3"));

      // Purchase 3: 3 + (1 + 3) = 3 + 4 = 7 tokens (total: 7)
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("7"));

      // Purchase 4: 7 + (1 + 7) = 7 + 8 = 15 tokens (total: 15)
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("15"));
    });

    it("Should emit correct amounts in TokenPurchased event", async function () {
      // First purchase
      await expect(tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE }))
        .to.emit(tokenSale, "TokenPurchased")
        .withArgs(user1.address, ethers.parseEther("1"));

      // Second purchase (with bonus)
      await expect(tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE }))
        .to.emit(tokenSale, "TokenPurchased")
        .withArgs(user1.address, ethers.parseEther("2"));
    });

    it("Should handle bonus for different users independently", async function () {
      // User1 first purchase
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));

      // User2 first purchase (no bonus, independent)
      await tokenSale.connect(user2).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user2.address)).to.equal(ethers.parseEther("1"));

      // User1 second purchase (gets bonus based on their balance)
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("3"));

      // User2 still has only 1 token
      expect(await waitToken.balanceOf(user2.address)).to.equal(ethers.parseEther("1"));
    });
  });

  describe("Multiple Users", function () {
    it("Should allow multiple users to buy tokens", async function () {
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user2).buyToken({ value: TOKEN_PRICE });

      expect(await waitToken.balanceOf(user1.address)).to.equal(BASE_TOKEN_AMOUNT);
      expect(await waitToken.balanceOf(user2.address)).to.equal(BASE_TOKEN_AMOUNT);
    });

    it("Should accumulate payments from multiple users", async function () {
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user2).buyToken({ value: TOKEN_PRICE });

      expect(await tokenSale.getBalance()).to.equal(TOKEN_PRICE * 2n);
    });
  });

  describe("Funds Withdrawal", function () {
    beforeEach(async function () {
      // Add some funds to the contract
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user2).buyToken({ value: TOKEN_PRICE });
    });

    it("Should allow owner to withdraw funds", async function () {
      const contractBalance = await tokenSale.getBalance();
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await tokenSale.connect(owner).withdrawFunds();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(await tokenSale.getBalance()).to.equal(0);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalance - gasUsed);
    });

    it("Should emit FundsWithdrawn event", async function () {
      const contractBalance = await tokenSale.getBalance();

      await expect(tokenSale.connect(owner).withdrawFunds())
        .to.emit(tokenSale, "FundsWithdrawn")
        .withArgs(owner.address, contractBalance);
    });

    it("Should reject withdrawal from non-owner", async function () {
      await expect(tokenSale.connect(user1).withdrawFunds()).to.be.revertedWith(
        "TokenSale: Only owner can call this"
      );
    });

    it("Should reject withdrawal when balance is zero", async function () {
      await tokenSale.connect(owner).withdrawFunds();

      await expect(tokenSale.connect(owner).withdrawFunds()).to.be.revertedWith(
        "TokenSale: No funds to withdraw"
      );
    });

    it("Should allow owner to withdraw after multiple sales", async function () {
      // More sales
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      await tokenSale.connect(user2).buyToken({ value: TOKEN_PRICE });

      const contractBalance = await tokenSale.getBalance();
      expect(contractBalance).to.equal(TOKEN_PRICE * 4n);

      await tokenSale.connect(owner).withdrawFunds();
      expect(await tokenSale.getBalance()).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle user buying tokens after transferring some away", async function () {
      // User1 buys and gets 1 token
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));

      // User1 buys again and gets 2 tokens (1 + 1 bonus)
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("3"));

      // User1 transfers 2 tokens to user2
      await waitToken.connect(user1).transfer(user2.address, ethers.parseEther("2"));
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));

      // User1 buys again, bonus based on current balance (1)
      // Should get 1 + 1 = 2 tokens
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("3"));
    });

    it("Should work correctly after tokens are used in other contracts", async function () {
      // Simulate tokens being used (transferred to another address)
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      const balance = await waitToken.balanceOf(user1.address);

      // Transfer all tokens away
      await waitToken.connect(user1).transfer(user2.address, balance);
      expect(await waitToken.balanceOf(user1.address)).to.equal(0);

      // Buy again - should get 1 token (no bonus, balance is 0)
      await tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE });
      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
    });

    it("Should handle concurrent purchases from same user", async function () {
      // Simulate multiple rapid purchases
      const purchases = [];
      for (let i = 0; i < 3; i++) {
        purchases.push(tokenSale.connect(user1).buyToken({ value: TOKEN_PRICE }));
      }

      await Promise.all(purchases);

      // After 3 purchases: 1 + 2 + 4 = 7 tokens
      // (Each purchase sees the updated balance from previous one)
      const finalBalance = await waitToken.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(ethers.parseEther("1")); // Should have more than initial
    });
  });
});
