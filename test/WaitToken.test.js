const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WaitToken", function () {
  let waitToken;
  let owner;
  let tokenSale;
  let user1;
  let user2;

  beforeEach(async function () {
    // Get signers
    [owner, tokenSale, user1, user2] = await ethers.getSigners();

    // Deploy WaitToken
    const WaitToken = await ethers.getContractFactory("WaitToken");
    waitToken = await WaitToken.deploy();
    await waitToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await waitToken.getAddress()).to.be.properAddress;
    });

    it("Should have correct name and symbol", async function () {
      expect(await waitToken.name()).to.equal("WaitToken");
      expect(await waitToken.symbol()).to.equal("WAIT");
    });

    it("Should have 18 decimals (ERC20 standard)", async function () {
      expect(await waitToken.decimals()).to.equal(18);
    });

    it("Should have initial supply of 0", async function () {
      const totalSupply = await waitToken.totalSupply();
      expect(totalSupply).to.equal(0);
    });

    it("Should not have TokenSale contract set initially", async function () {
      expect(await waitToken.tokenSaleContract()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Setting TokenSale Contract", function () {
    it("Should allow setting TokenSale contract address", async function () {
      await waitToken.setTokenSaleContract(tokenSale.address);
      expect(await waitToken.tokenSaleContract()).to.equal(tokenSale.address);
    });

    it("Should emit TokenSaleContractSet event", async function () {
      await expect(waitToken.setTokenSaleContract(tokenSale.address))
        .to.emit(waitToken, "TokenSaleContractSet")
        .withArgs(tokenSale.address);
    });

    it("Should reject zero address", async function () {
      await expect(
        waitToken.setTokenSaleContract(ethers.ZeroAddress)
      ).to.be.revertedWith("WaitToken: Invalid address");
    });

    it("Should only allow setting TokenSale once", async function () {
      await waitToken.setTokenSaleContract(tokenSale.address);

      await expect(
        waitToken.setTokenSaleContract(user1.address)
      ).to.be.revertedWith("WaitToken: TokenSale already set");
    });
  });

  describe("Minting", function () {
    beforeEach(async function () {
      // Set tokenSale as authorized minter
      await waitToken.setTokenSaleContract(tokenSale.address);
    });

    it("Should allow TokenSale contract to mint tokens", async function () {
      const amount = ethers.parseEther("10");

      await waitToken.connect(tokenSale).mint(user1.address, amount);

      expect(await waitToken.balanceOf(user1.address)).to.equal(amount);
      expect(await waitToken.totalSupply()).to.equal(amount);
    });

    it("Should emit Transfer event when minting", async function () {
      const amount = ethers.parseEther("5");

      await expect(waitToken.connect(tokenSale).mint(user1.address, amount))
        .to.emit(waitToken, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, amount);
    });

    it("Should reject minting from unauthorized addresses", async function () {
      const amount = ethers.parseEther("10");

      await expect(
        waitToken.connect(owner).mint(user1.address, amount)
      ).to.be.revertedWith("WaitToken: Only TokenSale can call this");

      await expect(
        waitToken.connect(user1).mint(user1.address, amount)
      ).to.be.revertedWith("WaitToken: Only TokenSale can call this");
    });

    it("Should reject minting to zero address", async function () {
      const amount = ethers.parseEther("10");

      await expect(
        waitToken.connect(tokenSale).mint(ethers.ZeroAddress, amount)
      ).to.be.revertedWith("WaitToken: Cannot mint to zero address");
    });

    it("Should reject minting zero amount", async function () {
      await expect(
        waitToken.connect(tokenSale).mint(user1.address, 0)
      ).to.be.revertedWith("WaitToken: Amount must be greater than zero");
    });

    it("Should allow multiple mints", async function () {
      const amount1 = ethers.parseEther("10");
      const amount2 = ethers.parseEther("5");

      await waitToken.connect(tokenSale).mint(user1.address, amount1);
      await waitToken.connect(tokenSale).mint(user1.address, amount2);

      expect(await waitToken.balanceOf(user1.address)).to.equal(amount1 + amount2);
    });

    it("Should mint to different addresses", async function () {
      const amount = ethers.parseEther("10");

      await waitToken.connect(tokenSale).mint(user1.address, amount);
      await waitToken.connect(tokenSale).mint(user2.address, amount);

      expect(await waitToken.balanceOf(user1.address)).to.equal(amount);
      expect(await waitToken.balanceOf(user2.address)).to.equal(amount);
      expect(await waitToken.totalSupply()).to.equal(amount * 2n);
    });
  });

  describe("ERC20 Standard Functions", function () {
    beforeEach(async function () {
      // Set tokenSale and mint some tokens
      await waitToken.setTokenSaleContract(tokenSale.address);
      await waitToken.connect(tokenSale).mint(user1.address, ethers.parseEther("100"));
    });

    it("Should allow token transfers", async function () {
      const amount = ethers.parseEther("10");

      await waitToken.connect(user1).transfer(user2.address, amount);

      expect(await waitToken.balanceOf(user1.address)).to.equal(ethers.parseEther("90"));
      expect(await waitToken.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should allow approve and transferFrom", async function () {
      const amount = ethers.parseEther("10");

      await waitToken.connect(user1).approve(user2.address, amount);
      expect(await waitToken.allowance(user1.address, user2.address)).to.equal(amount);

      await waitToken.connect(user2).transferFrom(user1.address, user2.address, amount);

      expect(await waitToken.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should reject transfers exceeding balance", async function () {
      const amount = ethers.parseEther("200");

      await expect(
        waitToken.connect(user1).transfer(user2.address, amount)
      ).to.be.reverted;
    });
  });
});
