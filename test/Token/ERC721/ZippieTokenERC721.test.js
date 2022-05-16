const { expect } = require("chai")
const { ethers, waffle } = require("hardhat")

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = ethers.utils.solidityKeccak256(['string'],["MINTER_ROLE"])
const PAUSER_ROLE = ethers.utils.solidityKeccak256(['string'],["PAUSER_ROLE"])
const APPROVER_ROLE = ethers.utils.solidityKeccak256(['string'],["APPROVER_ROLE"])
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

describe("ZippieTokenERC721", () => {

	let accounts, admin, operator, sender, receiver, other;

  beforeEach(async function () {
    accounts = await hre.ethers.getSigners()
    admin = accounts[0].address
    operator = accounts[1].address
    sender = accounts[2].address
    receiver = accounts[3].address
    other = accounts[4].address

    const ZippieTokenERC721 = await ethers.getContractFactory("ZippieTokenERC721")
		this.token = await ZippieTokenERC721.deploy(admin, operator, "ZIPPIE-ERC721", "ZIPPIE-ERC721", "baseURI")
		await this.token.deployed()

    await this.token.mint(sender, "1", "tokenURI", { from: admin })

    // Chage signer account
    this.tokenUsingOtherSigner = this.token.connect(accounts[4])
    this.tokenUsingSenderSigner = this.token.connect(accounts[2])
  })
  
  describe('AdminRole', function() {
    it("owner and operator has the admin role", async function () {
      expect(await this.token.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.equal('2')
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, operator)).to.equal(true)
    })

    it("allows admin to add new admins", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      const receipt = this.token.grantRole(DEFAULT_ADMIN_ROLE, other, { from: admin })
      await expect(receipt).to.emit(this.token, 'RoleGranted').withArgs(DEFAULT_ADMIN_ROLE, other, admin)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
    })

    it("reverts if a non-admin tries to add new admins", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expect(this.tokenUsingOtherSigner.grantRole(DEFAULT_ADMIN_ROLE, other, { from: other }))
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x000000000000000000000000000000000000000000000000000000000000000")
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
    })

    it("allows admin to revoke admins", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      const receipt = this.token.revokeRole(DEFAULT_ADMIN_ROLE, admin, { from: admin })
      await expect(receipt).to.emit(this.token, 'RoleRevoked').withArgs(DEFAULT_ADMIN_ROLE, admin, admin)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(false)
    })

    it("reverts is a non-admin tries to revoke admins", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      await expect(this.tokenUsingOtherSigner.revokeRole(DEFAULT_ADMIN_ROLE, admin, { from: other }))
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
    })

    it("allows admin to renounce", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await this.token.grantRole(DEFAULT_ADMIN_ROLE, other, { from: admin })
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
      const receipt = this.tokenUsingOtherSigner.renounceRole(DEFAULT_ADMIN_ROLE, other, { from: other })
      await expect(receipt).to.emit(this.tokenUsingOtherSigner, 'RoleRevoked').withArgs(DEFAULT_ADMIN_ROLE, other, other)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
    })

    it("reverts if someone else tries to renounce admin", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await this.token.grantRole(DEFAULT_ADMIN_ROLE, other, { from: admin })
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
      await expect(this.token.renounceRole(DEFAULT_ADMIN_ROLE, other, { from: admin }))
        .to.be.revertedWith("AccessControl: can only renounce roles for self")
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
    })
  })

  describe('MinterRole', function() {
    it("owner and operator has the minter role", async function () {
      expect(await this.token.getRoleMemberCount(MINTER_ROLE)).to.equal('2')
      expect(await this.token.hasRole(MINTER_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, operator)).to.equal(true)
    })
    
    it("allows admin to add minters", async function () {
      expect(await this.token.getRoleAdmin(MINTER_ROLE)).to.equal(DEFAULT_ADMIN_ROLE)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(false)
      const receipt = await this.token.grantRole(MINTER_ROLE, other, { from: admin })
      await expect(receipt).to.emit(this.token, 'RoleGranted').withArgs(MINTER_ROLE, other, admin)
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
    })

    it("reverts if a non-admin tries to add minters", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expect(this.tokenUsingOtherSigner.grantRole(MINTER_ROLE, other, { from: other }))
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
    })

    it("reverts is a minter tries to add minters", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await this.token.grantRole(MINTER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
      await expect(this.tokenUsingOtherSigner.grantRole(MINTER_ROLE, other, { from: other }))
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
    })

    it("allows admin to revoke minters", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, admin)).to.equal(true)
      const receipt = this.token.revokeRole(MINTER_ROLE, admin, { from: admin })
      await expect(receipt).to.emit(this.token, 'RoleRevoked').withArgs(MINTER_ROLE, admin, admin)
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(false)
    })

    it("reverts if a non-admin tries to revoke minters", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expect(this.tokenUsingOtherSigner.revokeRole(MINTER_ROLE, admin, { from: other }))
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
    })

    it("reverts is a minter tries to revoke minters", async function () {
      await this.token.grantRole(MINTER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expect(this.tokenUsingOtherSigner.revokeRole(MINTER_ROLE, other, { from: other }))
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
    })

    it("allows minter to renounce", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(false)
      await this.token.grantRole(MINTER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      const receipt = this.tokenUsingOtherSigner.renounceRole(MINTER_ROLE, other, { from: other })
      await expect(receipt).to.emit(this.tokenUsingOtherSigner, 'RoleRevoked').withArgs(MINTER_ROLE, other, other)
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(false)
    })

    it("reverts if someone else tries to renounce minter", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(false)
      await this.token.grantRole(MINTER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expect(this.token.renounceRole(MINTER_ROLE, other, { from: admin }))
        .to.be.revertedWith("AccessControl: can only renounce roles for self")
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
    })
  })

  describe('PauserRole', function() {
    it("owner and operator has the pauser role", async function () {
      expect(await this.token.getRoleMemberCount(PAUSER_ROLE)).to.equal('2')
      expect(await this.token.hasRole(PAUSER_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, operator)).to.equal(true)
    })
    
    it("allows admin to add pausers", async function () {
      expect(await this.token.getRoleAdmin(PAUSER_ROLE)).to.equal(DEFAULT_ADMIN_ROLE)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(false)
      const receipt = this.token.grantRole(PAUSER_ROLE, other, { from: admin })
      await expect(receipt).to.emit(this.token, 'RoleGranted').withArgs(PAUSER_ROLE, other, admin)
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
    })

    it("reverts is a non-admin tries to add pausers", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expect(this.tokenUsingOtherSigner.grantRole(PAUSER_ROLE, other, { from: other }))
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
    })

    it("reverts is a pauser tries to add pausers", async function () {
      await this.token.grantRole(PAUSER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expect(this.tokenUsingOtherSigner.grantRole(PAUSER_ROLE, other, { from: other }))
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
    })

    it("allows admin to revoke pausers", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(PAUSER_ROLE, admin)).to.equal(true)
      const receipt = this.token.revokeRole(PAUSER_ROLE, admin, { from: admin })
      await expect(receipt).to.emit(this.token, 'RoleRevoked').withArgs(PAUSER_ROLE, admin, admin)
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(false)
    })

    it("reverts is a non-admin tries to revoke pausers", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expect(this.tokenUsingOtherSigner.revokeRole(PAUSER_ROLE, other, { from: other }))
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
    })

    it("reverts is a pauser tries to revoke pausers", async function () {
      await this.token.grantRole(PAUSER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expect(this.tokenUsingOtherSigner.revokeRole(PAUSER_ROLE, other, { from: other }))
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
    })

    it("allows pauser to renounce", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(false)
      await this.token.grantRole(PAUSER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      const receipt = this.tokenUsingOtherSigner.renounceRole(PAUSER_ROLE, other, { from: other })
      await expect(receipt).to.emit(this.tokenUsingOtherSigner, 'RoleRevoked').withArgs(PAUSER_ROLE, other, other)
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(false)
    })

    it("reverts if someone else tries to renounce pauser", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(false)
      await this.token.grantRole(PAUSER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expect(this.token.renounceRole(PAUSER_ROLE, other, { from: admin }))
        .to.be.revertedWith("AccessControl: can only renounce roles for self")
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
    })
  })

  describe('Mint', function() {
    it("allows minters to mint new tokens", async function() {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.hasRole(MINTER_ROLE, admin)).to.be.equal(true)
      const receipt = this.token.mint(sender, "2", "/tokenURI", { from: admin })
      await expect(receipt).to.emit(this.token, 'Transfer').withArgs(ZERO_ADDRESS, sender, "2")
      expect(await this.token.balanceOf(sender)).to.be.equal(2)
      expect(await this.token.tokenURI("2")).to.be.equal("baseURI/tokenURI")
    })
  
    it("reverts if non-minter tries to mint new tokens", async function() {
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.be.equal(false)
      await expect(this.tokenUsingOtherSigner.mint(sender, "2", "tokenURI", { from: other }))
        .to.be.revertedWith("ZippieTokenERC721: must have minter role to mint")
    })
  })

  describe('Transfers', function() {
    it("allows approver approve transfers", async function () {
      expect(await this.token.ownerOf("1")).to.be.equal(sender)
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.balanceOf(receiver)).to.be.equal(0)
      const receipt1 = this.tokenUsingSenderSigner.transferFrom(sender, receiver, "1", { from: sender })
      await expect(receipt1).to.emit(this.tokenUsingSenderSigner, 'Transfer').withArgs(sender, this.token.address, "1")
      await expect(receipt1).to.emit(this.token, 'NewTransfer').withArgs("1", sender, receiver)
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address)
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(1)

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true)
      const receipt2 = this.token.approveTransferFrom(sender, receiver, "1", '0x01', { from: admin })
      await expect(receipt2).to.emit(this.token, 'Transfer').withArgs(this.token.address, receiver, "1")
      await expect(receipt2).to.emit(this.token, 'ApprovedTransfer').withArgs("1", sender, receiver, admin, '0x01')
      expect(await this.token.ownerOf("1")).to.be.equal(receiver)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(0)
      expect(await this.token.balanceOf(receiver)).to.be.equal(1)
    })

    it("allows approver to reject transfers", async function () {
      expect(await this.token.ownerOf("1")).to.be.equal(sender)
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.balanceOf(receiver)).to.be.equal(0)
      const receipt1 = this.tokenUsingSenderSigner.transferFrom(sender, receiver, "1", { from: sender })
      await expect(receipt1).to.emit(this.tokenUsingSenderSigner, 'Transfer').withArgs(sender, this.token.address, "1")
      await expect(receipt1).to.emit(this.tokenUsingSenderSigner, 'NewTransfer').withArgs("1", sender, receiver)
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address)
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(1)

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true)
      const receipt2 = this.token.rejectTransferFrom(sender, receiver, "1", '0x01', { from: admin })
      await expect(receipt2).to.emit(this.token, 'Transfer').withArgs(this.token.address, sender, "1")
      await expect(receipt2).to.emit(this.token, 'RejectedTransfer').withArgs("1", sender, receiver, admin, '0x01')
      expect(await this.token.ownerOf("1")).to.be.equal(sender)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(0)
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
    })

    it("reverts if approver is trying to send tokens to a different address when approving", async function () {
      expect(await this.token.exists("1")).to.be.equal(true)
      expect(await this.token.ownerOf("1")).to.be.equal(sender)
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.balanceOf(receiver)).to.be.equal(0)
      const receipt = this.tokenUsingSenderSigner.transferFrom(sender, receiver, "1", { from: sender })
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'Transfer').withArgs(sender, this.token.address, "1")
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'NewTransfer').withArgs("1", sender, receiver)
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address)
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(1)

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true)
      await expect(this.token.approveTransferFrom(sender, other, "1", '0x01', { from: admin }))
        .to.be.revertedWith("ZippieTokenERC721: invalid address")
      expect(await this.token.exists("1")).to.be.equal(true)
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(1)
    })

    it("reverts if approver is trying to send tokens to a different address when rejecting", async function () {
      expect(await this.token.exists("1")).to.be.equal(true)
      expect(await this.token.ownerOf("1")).to.be.equal(sender)
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.balanceOf(receiver)).to.be.equal(0)
      const receipt = this.tokenUsingSenderSigner.transferFrom(sender, receiver, "1", { from: sender })
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'Transfer').withArgs(sender, this.token.address, "1")
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'NewTransfer').withArgs("1", sender, receiver)
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address)
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(1)

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true)
      await expect(this.token.rejectTransferFrom(other, receiver, "1", '0x01', { from: admin }))
        .to.be.revertedWith("ZippieTokenERC721: invalid address")
      expect(await this.token.exists("1")).to.be.equal(true)
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(1)
    })

    it("reverts if approver is trying to transfer tokens in transit", async function () {
      expect(await this.token.exists("1")).to.be.equal(true)
      expect(await this.token.exists("2")).to.be.equal(false)
      expect(await this.token.ownerOf("1")).to.be.equal(sender)
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.balanceOf(receiver)).to.be.equal(0)
      const receipt = this.tokenUsingSenderSigner.transferFrom(sender, receiver, "1", { from: sender })
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'Transfer').withArgs(sender, this.token.address, "1")
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'NewTransfer').withArgs("1", sender, receiver)
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address)
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(1)

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true)
      await expect(this.token.transferFrom(this.token.address, other, "1", { from: admin }))
        .to.be.revertedWith("ZippieTokenERC721: transfer caller is not owner nor approved")
      expect(await this.token.exists("1")).to.be.equal(true)
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(1)
    })
  
    it("reverts if approver is trying to burn tokens in transit", async function () {
      expect(await this.token.exists("1")).to.be.equal(true)
      expect(await this.token.exists("2")).to.be.equal(false)
      expect(await this.token.ownerOf("1")).to.be.equal(sender)
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.balanceOf(receiver)).to.be.equal(0)
      const receipt = this.tokenUsingSenderSigner.transferFrom(sender, receiver, "1", { from: sender })
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'Transfer').withArgs(sender, this.token.address, "1")
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'NewTransfer').withArgs("1", sender, receiver)
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address)
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(1)

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true)
      await expect(this.token.burn("1", { from: admin })).to.be.revertedWith("ERC721Burnable: caller is not owner nor approved")
      expect(await this.token.exists("1")).to.be.equal(true)
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address)
      expect(await this.token.balanceOf(this.token.address)).to.be.equal(1)
    })
  
    it("reverts if trying to transfer tokens to the zero address", async function () {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      await expect(this.tokenUsingSenderSigner.transferFrom(sender, ZERO_ADDRESS, "1", { from: sender }))
        .to.be.revertedWith("ZippieTokenERC721: transfer to the zero address")
    })
  
    it("reverts if trying to transfer tokens and not owner or approved", async function () {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.ownerOf("1")).to.not.be.equal(other)
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS)
      expect(await this.token.isApprovedForAll(sender, other)).to.be.equal(false)
      await expect(this.tokenUsingOtherSigner.transferFrom(sender, receiver, "1", { from: other }))
        .to.be.revertedWith("ZippieTokenERC721: transfer caller is not owner nor approved")
    })
  
    it("allows to transfer a specific tokens from other accounts when first approved", async function() {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS)
      const receipt = this.tokenUsingSenderSigner.approve(other, "1", { from: sender })
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'Approval').withArgs(sender, other, "1")
      expect(await this.token.getApproved("1")).to.be.equal(other)
      await this.tokenUsingOtherSigner.transferFrom(sender, receiver, "1", { from: other })
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
    })

    it("allows to transfer all tokens from other accounts when first approved for all", async function() {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS)
      expect(await this.token.isApprovedForAll(sender, other)).to.be.equal(false)
      const receipt = this.tokenUsingSenderSigner.setApprovalForAll(other, true, { from: sender })
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'ApprovalForAll').withArgs(sender, other, true)
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS)
      expect(await this.token.isApprovedForAll(sender, other)).to.be.equal(true)
      await this.tokenUsingOtherSigner.transferFrom(sender, receiver, "1", { from: other })
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
    })
  
    it("reverts if trying to transfers tokens from other accounts when not approved", async function () {
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS)
      await expect(this.tokenUsingOtherSigner.transferFrom(sender, receiver, "1", { from: other }))
        .to.be.revertedWith("ZippieTokenERC721: transfer caller is not owner nor approved")
    })    
  })

  describe('Burn', function() {
    it("allows token holders to burn tokens", async function() {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      const receipt = this.tokenUsingSenderSigner.burn("1", { from: sender })
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'Transfer').withArgs(sender, ZERO_ADDRESS, "1")
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
    })
  
    it("reverts if trying to burn more tokens than current account balance", async function () {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      await expect(this.tokenUsingSenderSigner.burn("2", { from: sender }))
        .to.be.revertedWith("ERC721: operator query for nonexistent token")
    })
  
    it("allows to burn a specific token from other accounts when first approved", async function() {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS)
      const receipt = this.tokenUsingSenderSigner.approve(other, "1", { from: sender })
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'Approval').withArgs(sender, other, "1")
      expect(await this.token.getApproved("1")).to.be.equal(other)
      await this.tokenUsingOtherSigner.burn("1", { from: other })
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
    })

    it("allows to burn all tokens from other accounts when first approved for all", async function() {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS)
      expect(await this.token.isApprovedForAll(sender, other)).to.be.equal(false)
      const receipt = this.tokenUsingSenderSigner.setApprovalForAll(other, true, { from: sender })
      await expect(receipt).to.emit(this.tokenUsingSenderSigner, 'ApprovalForAll').withArgs(sender, other, true)
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS)
      expect(await this.token.isApprovedForAll(sender, other)).to.be.equal(true)

      await this.tokenUsingOtherSigner.burn("1", { from: other })
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
    })
  
    it("reverts if trying to burn tokens from other accounts when not approved", async function () {
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS)
      await expect(this.tokenUsingOtherSigner.burn("1", { from: other }))
        .to.be.revertedWith("ERC721Burnable: caller is not owner nor approved")
    })
  })  

  describe('Pause', function() {
    it("allows pausers to pause token", async function () {
      expect(await this.token.hasRole(PAUSER_ROLE, admin)).to.be.equal(true)
      const receipt = this.token.pause({ from: admin })
      await expect(receipt).to.emit(this.token, 'Paused').withArgs(admin)
    })
   
    it("reverts if non-pausers tries to pause token", async function () {
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.be.equal(false)
      await expect(this.tokenUsingOtherSigner.pause({ from: other }))
        .to.be.revertedWith("ZippieTokenERC721: must have pauser role to pause")
    })
  
    it("allows pausers to unpause token", async function () {
      await this.token.pause({ from: admin })
      const receipt = this.token.unpause({ from: admin })
      await expect(receipt).to.emit(this.token, 'Unpaused').withArgs(admin)
    })
  
    it("reverts if non-pausers tries to unpause token", async function () {
      await expect(this.tokenUsingOtherSigner.unpause({ from: other }))
        .to.be.revertedWith("ZippieTokenERC721: must have pauser role to unpause")
    })
  
    it("allows transfer of tokens when not paused", async function () {
      expect(await this.token.paused()).to.be.equal(false)
      await this.tokenUsingSenderSigner.transferFrom(sender, receiver, "1", { from: sender })
    })
  
    it("reverts if trying to transfer tokens when paused", async function () {
      await this.token.pause({ from: admin })
      expect(await this.token.paused()).to.be.equal(true)
      await expect(this.token.transferFrom(sender, receiver, "1", { from: admin }))
        .to.be.revertedWith("ZippieTokenERC721: transfer caller is not owner nor approved")
    })
  })
})

