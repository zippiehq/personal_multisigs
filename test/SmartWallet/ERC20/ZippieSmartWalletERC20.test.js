const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers")
const { expect } = require('chai')
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")
const ZippieSmartWalletERC20 = artifacts.require("ZippieSmartWalletERC20")
const BasicERC20Mock = artifacts.require("BasicERC20Mock")
const { 
  ZERO_ADDRESS,
  getAccountAddress, 
  getTransferPaymentSignature 
} = require('./HelpFunctions')

const orderId = "0x0000000000000000000000000000000000000000000000000000000000000001"
const orderId2 = "0x0000000000000000000000000000000000000000000000000000000000000002"

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const TRANSFER_B2B = web3.utils.sha3("TRANSFER_B2B")


contract("ZippieSmartWalletERC20", ([owner, admin, merchant, merchant1, merchant2, recipient, other]) => {

  beforeEach(async function () {
    this.merchantRegistry = await ZippieMerchantRegistry.new({ from: admin })
    this.wallet = await ZippieSmartWalletERC20.new(this.merchantRegistry.address, { from: owner })
    this.token = await BasicERC20Mock.new(owner, { from: owner })
  })

  describe('ZippieSmartWalletERC20', function() {
    it("allows merchant owner to transfer payment tokens from associated smart accounts", async function () {
      // Get smart account address	
      const accountAddress = getAccountAddress(merchant1, orderId, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: accountAddress, value: new BN(1) })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))

      // Set merchant owner "merchant"
      await this.merchantRegistry.setMerchantOwner(merchant1, merchant, { from: admin })
      expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchant)

      // Set premission for B2B
      await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
      expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
      
      // Transfer payment from smart account to recipient (send from "merchant")
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      await this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(1), { from: merchant })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(1))
    })

    it("prevents merchant non-owners to transfer payment tokens from associated smart accounts", async function () {
      // Get smart account address	
      const accountAddress = getAccountAddress(merchant1, orderId, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: accountAddress, value: new BN(1) })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))

      // Set merchant owner to "merchant"
      await this.merchantRegistry.setMerchantOwner(merchant1, merchant, { from: admin })
      expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchant)
      
      // Transfer payment from smart account to recipient (send from "other")
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(1), { from: other }),
        'Sender not merchant owner'
      )
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
    })

    it("prevents to transfer payment tokens from associated smart accounts before merchant owner is set", async function () {
      // Get smart account address	
      const accountAddress = getAccountAddress(merchant1, orderId, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: accountAddress, value: new BN(1) })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))
      
      // Merchant owner not set
      expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(ZERO_ADDRESS)

      // Transfer payment from smart account to recipient before mwrchant owner is set
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(1), { from: merchant }),
        'Merchant owner not set'
      )
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
    })

    it("allows a merchant owner to manage multiple smart account using different orderIds", async function () {
      // Get smart account address 1 & 2	(differnet orderIds)
      const accountAddress1 = getAccountAddress(merchant1, orderId, this.wallet.address)
      const accountAddress2 = getAccountAddress(merchant1, orderId2, this.wallet.address)
      expect(accountAddress1).to.not.equal(accountAddress2)

      // Set merchant owner "merchant" (both accounts)
      await this.merchantRegistry.setMerchantOwner(merchant1, merchant, { from: admin })
      expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchant)

      // Do ERC20 transfer to smart account 1 & 2
      await this.token.transfer(accountAddress1, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress1)).to.be.bignumber.equal(new BN(1))
      await this.token.transfer(accountAddress2, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress2)).to.be.bignumber.equal(new BN(1))

      // Set premission for B2B
      await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
      expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
      
      // Transfer payment from smart account 1 to recipient 
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      await this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(1), { from: merchant })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(1))   

      // Transfer payment from smart account 2 to recipient
      await this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId2, new BN(1), { from: merchant })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(2)) 
    })

    it("allow different merchant owners to manage smart accounts with same orderId", async function () {
      // Get smart account address 1 & 2 (differnet merchant1s)
      const accountAddress1 = getAccountAddress(merchant1, orderId, this.wallet.address)
      const accountAddress2 = getAccountAddress(merchant2, orderId, this.wallet.address)
      expect(accountAddress1).to.not.equal(accountAddress2)

      // Set merchant owner "merchant" (account 1)
      await this.merchantRegistry.setMerchantOwner(merchant1, merchant, { from: admin })
      expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchant)
      
      // Set merchant owner "other" (account 2)
      await this.merchantRegistry.setMerchantOwner(merchant2, other, { from: admin })
      expect(await this.merchantRegistry.merchantOwner(merchant2)).to.equal(other)

      // Set premission for B2B (account 1)
      await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
      expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)

      // Set premission for B2B (account 2)
      await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant2, { from: admin })
      expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant2)).to.equal(true)

      // Do ERC20 transfer to smart account 1 & 2
      await this.token.transfer(accountAddress1, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress1)).to.be.bignumber.equal(new BN(1))
      await this.token.transfer(accountAddress2, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress2)).to.be.bignumber.equal(new BN(1))

      // Try to transfer payment from each others accounts
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(1), { from: other }),
        'Sender not merchant owner'
      ) 
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchant2, orderId, new BN(1), { from: merchant }),
        'Sender not merchant owner'
      )
      
      // Transfer payment from smart account 1 to recipient (send from "merchant")
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      await this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(1), { from: merchant })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(1))   

      // Transfer payment from smart account 2 to recipient (send from "other")
      await this.wallet.transferPayment(this.token.address, recipient, merchant2, orderId, new BN(1), { from: other })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(2)) 
    })

    it("allows merchant owner to transfer payment tokens from a associated smart account multiple times", async function () {
      // Get smart account address 
      const accountAddress = getAccountAddress(merchant1, orderId, this.wallet.address)

      // Set merchant owner "merchant"
      await this.merchantRegistry.setMerchantOwner(merchant1, merchant, { from: admin })
      expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchant)

      // Set premission for B2B
      await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
      expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)

      // Do ERC20 transfer to smart account
      await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))
      await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(2))
      
      // Transfer payment from smart account to recipient
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      await this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(1), { from: merchant })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(1))   

      // Transfer payment from smart account to recipient
      await this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(1), { from: merchant })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(2)) 
    })

    it("rejects payment transfers with amount 0", async function () {      
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(0), { from: merchant }),
        'Amount must be greater than 0'
      )
    })

    it("rejects to transfer payment tokens from associated smart accounts if amount exceeds balance", async function () {
      // Get smart account address	
      const accountAddress = getAccountAddress(merchant1, orderId, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: accountAddress, value: new BN(1) })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))

      // Set merchant owner "merchant"
      await this.merchantRegistry.setMerchantOwner(merchant1, merchant, { from: admin })
      expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchant)

      // Set premission for B2B
      await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
      expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
      
      // Transfer payment from smart account to recipient with amount greater than balance
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(2), { from: merchant }),
        "ERC20: transfer amount exceeds balance"
      )
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
    })

    it("deploys and kills a new smart account contract when payment transfer is done first time", async function () {
			// Check account address calculation
      const accountAddress = getAccountAddress(merchant1, orderId, this.wallet.address)
			const salt = web3.utils.soliditySha3(merchant1, orderId)
      const accountAddressSolidity = await this.wallet.getAccountAddress(salt, { from: owner })
      assert(accountAddress === accountAddressSolidity, "account address calculation didn't match")

      // Set merchant owner "merchant"
      await this.merchantRegistry.setMerchantOwner(merchant1, merchant, { from: admin })
      expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchant)

      // Set premission for B2B
      await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
      expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)

      // Do ERC20 transfer to smart account
      await this.token.transfer(accountAddress, new BN(2), { from: owner })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(2))
      
      // Transfer payment from smart account to recipient
      expect(await this.token.allowance(accountAddress, this.wallet.address)).to.be.bignumber.equal(new BN(0))
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      const transferPaymentTx1 = await this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(1), { from: merchant })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(1))   
      expect(await this.token.allowance(accountAddress, this.wallet.address)).to.be.bignumber.above(new BN(0))

      // Check events for first transfer (account created / approval event)
      assert(transferPaymentTx1.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
			}) === true, "missing Transfer event")
			assert(transferPaymentTx1.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Approval(address,address,uint256)") 
				&& log.data === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' 
			}) === true, "missing Approval event")
			assert(transferPaymentTx1.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Approval(address,address,uint256)") 
				&& log.data !== '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' 
			}) === true, "missing Approval event")

      // Transfer payment from smart account to recipient
      const transferPaymentTx2 = await this.wallet.transferPayment(this.token.address, recipient, merchant1, orderId, new BN(1), { from: merchant })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(2)) 
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(0))

      // Check events for second transfer (account should not be crated / no approval event)
			assert(transferPaymentTx2.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
			}) === true, "missing Transfer event")
			assert(transferPaymentTx2.receipt.rawLogs.some(log => {
				return log.topics[0] === web3.utils.sha3("Approval(address,address,uint256)") 
				&& log.data === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' 
			}) === false, "unexpected Approval event")
			assert(transferPaymentTx2.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Approval(address,address,uint256)") 
				&& log.data !== '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' 
      }) === true, "missing Approval event")
      
      console.log(`Gas used for transferPayment w/ createAccount: ${transferPaymentTx1.receipt.gasUsed}`)
      console.log(`Gas used for transferPayment w/o createAccount: ${transferPaymentTx2.receipt.gasUsed}`)
    })
  })
})
