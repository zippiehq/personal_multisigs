const { expect } = require("chai")
const { ethers, waffle } = require("hardhat")

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = ethers.utils.solidityKeccak256(['string'],["MINTER_ROLE"])
const PAUSER_ROLE = ethers.utils.solidityKeccak256(['string'],["PAUSER_ROLE"])
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

describe("ZippieTokenERC20", () => {

	let accounts, admin, operator, sender, receiver, other;

  beforeEach(async function () {
    accounts = await hre.ethers.getSigners()
    admin = accounts[0].address
    operator = accounts[1].address
    sender = accounts[2].address
    receiver = accounts[3].address
    other = accounts[4].address

    const ZippieTokenERC20 = await ethers.getContractFactory("ZippieTokenERC20")
		this.token = await ZippieTokenERC20.deploy(admin, operator, "ZIPPIE-ERC20", "ZIPPIE-ERC20", 6)
		await this.token.deployed()

    await this.token.mint(sender, ethers.BigNumber.from(1), { from: admin })

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
        .to.be.revertedWith("AccessControl: account 0xc1d7bd24bf47d12a3a518984b296afc6d0d941ac is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
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
      const receipt = this.token.grantRole(MINTER_ROLE, other, { from: admin })
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
      const receipt = await this.tokenUsingOtherSigner.renounceRole(MINTER_ROLE, other, { from: other })
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
      const receipt = await this.token.revokeRole(PAUSER_ROLE, admin, { from: admin })
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
      const receipt = this.token.mint(sender, 1, { from: admin })
      await expect(receipt).to.emit(this.token, "Transfer").withArgs(ZERO_ADDRESS, sender, 1)
      expect(await this.token.balanceOf(sender)).to.be.equal(2)
    })
  
    it("reverts if non-minter tries to mint new tokens", async function() {
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.be.equal(false)
      await expect(this.tokenUsingOtherSigner.mint(sender, 1, { from: other }))
        .to.be.revertedWith('ZippieTokenERC20: must have minter role to mint')
    })
  })

  describe('Transfers', function() {
    it("allows token holders to transfer tokens", async function () {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.balanceOf(receiver)).to.be.equal(0)
      const receipt = this.tokenUsingSenderSigner.transfer(receiver, 1, { from: sender })
      await expect(receipt).to.emit(this.token, "Transfer").withArgs(sender, receiver, 1)
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
      expect(await this.token.balanceOf(receiver)).to.be.equal(1)
    })
  
    it("reverts if trying to transfer tokens to the zero address", async function () {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      await expect(this.tokenUsingSenderSigner.transfer(ZERO_ADDRESS, 1, { from: sender }))
        .to.be.revertedWith("ERC20: transfer to the zero address")
    })
  
    it("reverts if trying to transfer more tokens than current account balance", async function () {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      await expect(this.tokenUsingSenderSigner.transfer(receiver, 2, { from: sender }))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance")
    })
  
    it("allows to transfer tokens from other accounts when first approved", async function() {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.allowance(sender, other)).to.be.equal(0)
      const receipt = this.tokenUsingSenderSigner.approve(other, 1, { from: sender })
      await expect(receipt).to.emit(this.token, "Approval").withArgs(sender, other, 1)
      expect(await this.token.allowance(sender, other)).to.be.equal(1)
      await this.tokenUsingOtherSigner.transferFrom(sender, receiver, 1, { from: other })
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
    })
  
    it("reverts if trying to transfers tokens from other accounts when not approved", async function () {
      expect(await this.token.allowance(sender, other)).to.be.equal(0)
      await expect(this.tokenUsingOtherSigner.transferFrom(sender, receiver, 1, { from: other }))
        .to.be.revertedWith("ERC20: insufficient allowance")
    })    
  })

  describe('Burn', function() {
    it("allows token holders to burn tokens", async function() {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      const receipt = this.tokenUsingSenderSigner.burn(1, { from: sender })
      await expect(receipt).to.emit(this.token, "Transfer").withArgs(sender, ZERO_ADDRESS, 1)
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
    })
  
    it("reverts if trying to burn more tokens than current account balance", async function () {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      await expect(this.tokenUsingSenderSigner.burn(2, { from: sender }))
        .to.be.revertedWith("ERC20: burn amount exceeds balance")
    })
  
    it("allows to burn tokens from other accounts when first approved", async function() {
      expect(await this.token.balanceOf(sender)).to.be.equal(1)
      expect(await this.token.allowance(sender, other)).to.be.equal(0)
      const receipt = this.tokenUsingSenderSigner.approve(other, 1, { from: sender })
      await expect(receipt).to.emit(this.token, "Approval").withArgs(sender, other, 1)
      expect(await this.token.allowance(sender, other)).to.be.equal(1)
      await this.tokenUsingOtherSigner.burnFrom(sender, 1, { from: other })
      expect(await this.token.balanceOf(sender)).to.be.equal(0)
    })
  
    it("reverts if trying to burn tokens from other accounts when not approved", async function () {
      expect(await this.token.allowance(sender, other)).to.be.equal(0)
      await expect(this.tokenUsingOtherSigner.burnFrom(sender, 1, { from: other }))
        .to.be.revertedWith("ERC20: insufficient allowance")
    })
  })  

  describe('Pause', function() {
    it("allows pausers to pause token", async function () {
      expect(await this.token.hasRole(PAUSER_ROLE, admin)).to.be.equal(true)
      const receipt = this.token.pause({ from: admin })
      await expect(receipt).to.emit(this.token, "Paused").withArgs(admin)
    })
   
    it("reverts if non-pausers tries to pause token", async function () {
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.be.equal(false)
      await expect(this.tokenUsingOtherSigner.pause({ from: other }))
        .to.be.revertedWith('ZippieTokenERC20: must have pauser role to pause')
    })
  
    it("allows pausers to unpause token", async function () {
      await this.token.pause({ from: admin })
      const receipt = this.token.unpause({ from: admin })
      await expect(receipt).to.emit(this.token, "Unpaused").withArgs(admin)
    })
  
    it("reverts if non-pausers tries to unpause token", async function () {
      await expect(this.tokenUsingOtherSigner.unpause({ from: other }))
        .to.be.revertedWith('ZippieTokenERC20: must have pauser role to unpause')
    })
  
    it("allows transfer of tokens when not paused", async function () {
      expect(await this.token.paused()).to.be.equal(false)
      await this.tokenUsingSenderSigner.transfer(receiver, 1, { from: sender })
    })
  
    it("reverts if trying to transfer tokens when paused", async function () {
      await this.token.pause({ from: admin })
      expect(await this.token.paused()).to.be.equal(true)
      await expect(this.token.transfer(receiver, 1, { from: admin }))
        .to.be.revertedWith("ERC20Pausable: token transfer while paused")
    })
  })
})

