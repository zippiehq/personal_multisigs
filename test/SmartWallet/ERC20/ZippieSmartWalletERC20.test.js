const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers")
const { expect } = require('chai')
const ZippieSmartWalletERC20 = artifacts.require("ZippieSmartWalletERC20")
const BasicERC20Mock = artifacts.require("BasicERC20Mock")
const { 
  ZERO_ADDRESS,
  getAccountAddress, 
  getTransferPaymentSignature 
} = require('./HelpFunctions')

const merchantId = "0x0000000000000000000000000000000000000000000000000000000000000001"
const merchantId2 = "0x0000000000000000000000000000000000000000000000000000000000000002"

const orderId = "0x0000000000000000000000000000000000000000000000000000000000000001"
const orderId2 = "0x0000000000000000000000000000000000000000000000000000000000000002"


contract("ZippieSmartWalletERC20", ([owner, merchant, recipient, other]) => {

  beforeEach(async function () {
    this.wallet = await ZippieSmartWalletERC20.new({ from: owner })
    this.token = await BasicERC20Mock.new(owner, { from: owner })
  })

  describe('ZippieSmartWalletERC20', function() {
    it("allows wallet owner to set merchant owner", async function () {
      expect(await this.wallet.owner()).to.equal(owner)
      expect(await this.wallet.merchantOwner(merchantId)).to.equal(ZERO_ADDRESS)
      const receipt = await this.wallet.setMerchantOwner(merchantId, merchant, { from: owner })
      expectEvent(receipt, 'MerchantOwnershipChanged')
      expect(await this.wallet.merchantOwner(merchantId)).to.equal(merchant)
    })

    it("prevents non-wallet owners to set merchant owner", async function () {
      expect(await this.wallet.owner()).to.not.equal(other)
      await expectRevert(
        this.wallet.setMerchantOwner(merchantId, merchant, { from: other }),
        'Ownable: caller is not the owner'
      )
    })

    it("allows wallet ownership to be transfered by wallet owner", async function () {
      expect(await this.wallet.owner()).to.equal(owner)
      const receipt = await this.wallet.transferOwnership(other, { from: owner })
      expectEvent(receipt, 'OwnershipTransferred')
      expect(await this.wallet.owner()).to.equal(other)
    })

    it("prevents wallet ownership to be transfered by non-wallet owner", async function () {
      expect(await this.wallet.owner()).to.not.equal(other)
      await expectRevert(
        this.wallet.transferOwnership(other, { from: other }),
        'Ownable: caller is not the owner'
      )
    })

    it("allows merchant owner to transfer payment tokens from associated smart accounts", async function () {
      // Get smart account address	
      const accountAddress = getAccountAddress(merchantId, orderId, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: accountAddress, value: new BN(1) })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))

      // Set merchant owner "merchant"
      await this.wallet.setMerchantOwner(merchantId, merchant, { from: owner })
      expect(await this.wallet.merchantOwner(merchantId)).to.equal(merchant)
      
      // Transfer payment from smart account to recipient (signed by "merchant")
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      const { v, r, s } = await getTransferPaymentSignature(merchant, merchantId, orderId, this.wallet.address, this.token.address, new BN(1), recipient)
      await this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, v, r, s, new BN(1), { from: owner })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(1))
    })

    it("prevents non-merchant owners to transfer payment tokens from associated smart accounts", async function () {
      // Get smart account address	
      const accountAddress = getAccountAddress(merchantId, orderId, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: accountAddress, value: new BN(1) })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))

      // Set merchant owner to "merchant"
      await this.wallet.setMerchantOwner(merchantId, merchant, { from: owner })
      expect(await this.wallet.merchantOwner(merchantId)).to.equal(merchant)
      
      // Transfer payment from smart account to recipient (signed by "other")
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      const { v, r, s } = await getTransferPaymentSignature(other, merchantId, orderId, this.wallet.address, this.token.address, new BN(1), recipient)
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, v, r, s, new BN(1), { from: owner }),
        'Invalid signature'
      )
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
    })

    it("prevents to transfer payment tokens from associated smart accounts before merchant owner is set", async function () {
      // Get smart account address	
      const accountAddress = getAccountAddress(merchantId, orderId, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: accountAddress, value: new BN(1) })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))
      
      // Merchant owner not set
      expect(await this.wallet.merchantOwner(merchantId)).to.equal(ZERO_ADDRESS)

      // Transfer payment from smart account to recipient before mwrchant owner is set
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      const { v, r, s } = await getTransferPaymentSignature(other, merchantId, orderId, this.wallet.address, this.token.address, new BN(1), recipient)
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, v, r, s, new BN(1), { from: owner }),
        'Merchant owner not set'
      )
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
    })

    it("allows a merchant owner to manage multiple smart account using different orderIds", async function () {
      // Get smart account address 1 & 2	(differnet orderIds)
      const accountAddress1 = getAccountAddress(merchantId, orderId, this.wallet.address)
      const accountAddress2 = getAccountAddress(merchantId, orderId2, this.wallet.address)
      expect(accountAddress1).to.not.equal(accountAddress2)

      // Set merchant owner "merchant" (both accounts)
      await this.wallet.setMerchantOwner(merchantId, merchant, { from: owner })
      expect(await this.wallet.merchantOwner(merchantId)).to.equal(merchant)

      // Do ERC20 transfer to smart account 1 & 2
      await this.token.transfer(accountAddress1, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress1)).to.be.bignumber.equal(new BN(1))
      await this.token.transfer(accountAddress2, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress2)).to.be.bignumber.equal(new BN(1))
      
      // Transfer payment from smart account 1 to recipient (signed by "merchant")
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      const signature1 = await getTransferPaymentSignature(merchant, merchantId, orderId, this.wallet.address, this.token.address, new BN(1), recipient)
      await this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, signature1.v, signature1.r, signature1.s, new BN(1), { from: owner })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(1))   

      // Transfer payment from smart account 2 to recipient (signed by "merchant")
      const singature2 = await getTransferPaymentSignature(merchant, merchantId, orderId2, this.wallet.address, this.token.address, new BN(1), recipient)
      await this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId2, singature2.v, singature2.r, singature2.s, new BN(1), { from: owner })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(2)) 
    })

    it("allow different merchant owners to manage smart accounts with same orderId", async function () {
      // Get smart account address 1 & 2 (differnet merchantIds)
      const accountAddress1 = getAccountAddress(merchantId, orderId, this.wallet.address)
      const accountAddress2 = getAccountAddress(merchantId2, orderId, this.wallet.address)
      expect(accountAddress1).to.not.equal(accountAddress2)

      // Set merchant owner "merchant" (account 1)
      await this.wallet.setMerchantOwner(merchantId, merchant, { from: owner })
      expect(await this.wallet.merchantOwner(merchantId)).to.equal(merchant)
      
      // Set merchant owner "other" (account 2)
      await this.wallet.setMerchantOwner(merchantId2, other, { from: owner })
      expect(await this.wallet.merchantOwner(merchantId2)).to.equal(other)

      // Do ERC20 transfer to smart account 1 & 2
      await this.token.transfer(accountAddress1, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress1)).to.be.bignumber.equal(new BN(1))
      await this.token.transfer(accountAddress2, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress2)).to.be.bignumber.equal(new BN(1))

      // Payment transfer signature 1 (signed by "merchant")
      const signature1 = await getTransferPaymentSignature(merchant, merchantId, orderId, this.wallet.address, this.token.address, new BN(1), recipient)
      // Payment transfer signature 2 (signed by "other")
      const singature2 = await getTransferPaymentSignature(other, merchantId2, orderId, this.wallet.address, this.token.address, new BN(1), recipient)

      // Try to transfer payment from each others accounts
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, singature2.v, singature2.r, singature2.s, new BN(1), { from: owner }),
        'Invalid signature'
      ) 
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchantId2, orderId, signature1.v, signature1.r, signature1.s, new BN(1), { from: owner }),
        'Invalid signature'
      )
      
      // Transfer payment from smart account 1 to recipient (signed by "merchant")
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      await this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, signature1.v, signature1.r, signature1.s, new BN(1), { from: owner })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(1))   

      // Transfer payment from smart account 2 to recipient (signed by "other")
      await this.wallet.transferPayment(this.token.address, recipient, merchantId2, orderId, singature2.v, singature2.r, singature2.s, new BN(1), { from: owner })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(2)) 
    })

    it("allows merchant owner to transfer payment tokens from a associated smart account multiple times (using same signature)", async function () {
      // Get smart account address 
      const accountAddress = getAccountAddress(merchantId, orderId, this.wallet.address)

      // Set merchant owner "merchant"
      await this.wallet.setMerchantOwner(merchantId, merchant, { from: owner })
      expect(await this.wallet.merchantOwner(merchantId)).to.equal(merchant)

      // Do ERC20 transfer to smart account
      await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))
      await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(2))
      
      // Transfer payment from smart account to recipient (signed by "merchant")
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      const signature1 = await getTransferPaymentSignature(merchant, merchantId, orderId, this.wallet.address, this.token.address, new BN(1), recipient)
      await this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, signature1.v, signature1.r, signature1.s, new BN(1), { from: owner })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(1))   

      // Transfer payment from smart account to recipient (reusing same signature)
      await this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, signature1.v, signature1.r, signature1.s, new BN(1), { from: owner })
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(2)) 
    })

    it("rejects payment transfers with amount 0", async function () {      
      const { v, r, s } = await getTransferPaymentSignature(merchant, merchantId, orderId, this.wallet.address, this.token.address, new BN(0), recipient)
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, v, r, s, new BN(0), { from: owner }),
        'Amount must be greater than 0'
      )
    })

    it("rejects to transfer payment tokens from associated smart accounts if amount exceeds balance", async function () {
      // Get smart account address	
      const accountAddress = getAccountAddress(merchantId, orderId, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(accountAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: accountAddress, value: new BN(1) })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))

      // Set merchant owner "merchant"
      await this.wallet.setMerchantOwner(merchantId, merchant, { from: owner })
      expect(await this.wallet.merchantOwner(merchantId)).to.equal(merchant)
      
      // Transfer payment from smart account to recipient (signed by "merchant") with amount greater than balance
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      const { v, r, s } = await getTransferPaymentSignature(merchant, merchantId, orderId, this.wallet.address, this.token.address, new BN(2), recipient)
      await expectRevert(
        this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, v, r, s, new BN(2), { from: owner }),
        "ERC20: transfer amount exceeds balance"
      )
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(1))
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
    })

    it("deploys and kills a new smart account contract when payment transfer is done first time", async function () {
			// Check account address calculation
      const accountAddress = getAccountAddress(merchantId, orderId, this.wallet.address)
			const salt = web3.utils.soliditySha3(merchantId, orderId)
      const accountAddressSolidity = await this.wallet.getAccountAddress(salt, { from: owner })
      assert(accountAddress === accountAddressSolidity, "account address calculation didn't match")

      // Set merchant owner "merchant"
      await this.wallet.setMerchantOwner(merchantId, merchant, { from: owner })
      expect(await this.wallet.merchantOwner(merchantId)).to.equal(merchant)

      // Do ERC20 transfer to smart account
      await this.token.transfer(accountAddress, new BN(2), { from: owner })
      expect(await this.token.balanceOf(accountAddress)).to.be.bignumber.equal(new BN(2))
      
      // Transfer payment from smart account to recipient (signed by "merchant")
      expect(await this.token.allowance(accountAddress, this.wallet.address)).to.be.bignumber.equal(new BN(0))
      expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0))
      const signature1 = await getTransferPaymentSignature(merchant, merchantId, orderId, this.wallet.address, this.token.address, new BN(1), recipient)
      const transferPaymentTx1 = await this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, signature1.v, signature1.r, signature1.s, new BN(1), { from: owner })
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

      // Transfer payment from smart account to recipient (signed by "merchant")
      const signature2 = await getTransferPaymentSignature(merchant, merchantId, orderId, this.wallet.address, this.token.address, new BN(1), recipient)
      const transferPaymentTx2 = await this.wallet.transferPayment(this.token.address, recipient, merchantId, orderId, signature2.v, signature2.r, signature2.s, new BN(1), { from: owner })
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
