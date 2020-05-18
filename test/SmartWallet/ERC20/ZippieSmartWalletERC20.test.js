const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers")
const { expect } = require('chai')
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")
const ZippieSmartWalletERC20 = artifacts.require("ZippieSmartWalletERC20")
const BasicERC20Mock = artifacts.require("BasicERC20Mock")
const { 
  ZERO_ADDRESS,
  getAccountAddress,  
} = require('./HelpFunctions')

const orderId1 = "0x0000000000000000000000000000000000000000000000000000000000000001"
const orderId2 = "0x0000000000000000000000000000000000000000000000000000000000000002"

const TRANSFER_B2B = web3.utils.sha3("TRANSFER_B2B")
const TRANSFER_B2C = web3.utils.sha3("TRANSFER_B2C")

contract("ZippieSmartWalletERC20", ([owner, admin, merchantOwner1, merchant1, merchantOwner2, merchant2, other, recipientConsumer]) => {

  beforeEach(async function () {
    this.merchantRegistry = await ZippieMerchantRegistry.new({ from: admin })
    this.wallet = await ZippieSmartWalletERC20.new(this.merchantRegistry.address, { from: owner })
    this.token = await BasicERC20Mock.new(owner, { from: owner })
  })

  describe('ZippieSmartWalletERC20', function() {
    describe('transferB2B', function() {
      it("allows merchant owner to transfer from associated smart accounts if merchant has B2B premission", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)
        const recipientAddress = getAccountAddress(merchant2, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Set premission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
        
        // Transfer from smart account to another merchant smart account
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        const receipt = await this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(1), { from: merchantOwner1 })
        expectEvent(receipt, 'TransferB2B', { 
          token: this.token.address, 
          senderMerchant: merchant1, 
          senderOrderId: orderId1, 
          sender: senderAddress, 
          recipientMerchant: merchant2, 
          recipientOrderId: orderId1, 
          recipient: recipientAddress, 
          amount: new BN(1) 
        })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))
      })

      it("prevents merchant non-owners to transfer from associated smart accounts", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)
        const recipientAddress = getAccountAddress(merchant2, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.not.equal(other)
        
        // Try to transfer from smart account with "other" (non-owner)
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchantOwner1, orderId2, new BN(1), { from: other }),
          'ZippieSmartWalletERC20: Sender not merchant owner'
        )
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
      })

      it("prevents to transfer from associated smart accounts before merchant owner is set", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)
        const recipientAddress = getAccountAddress(merchant2, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        
        // Merchant owner not set
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(ZERO_ADDRESS)

        // Try to transfer from smart account before merchant owner is set
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(1), { from: merchantOwner1 }),
          'ZippieSmartWalletERC20: Merchant owner not set'
        )
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
      })

      it("prevents to transfer from associated smart accounts if merchant has not B2B premission", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)
        const recipientAddress = getAccountAddress(merchant2, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        
        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Hss not premission for B2B
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(false)

        // Try to transfer from smart account before merchant owner is set
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(1), { from: merchantOwner1 }),
          'ZippieSmartWalletERC20: Sender missing required premission to tranfer B2'
        )
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
      })

      it("allows a merchant owner to manage multiple smart account using same merchant account but different orderIds", async function () {
        // Get smart accounts
        const senderAddress1 = getAccountAddress(merchant1, orderId1, this.wallet.address)
        const senderAddress2 = getAccountAddress(merchant1, orderId2, this.wallet.address)
        const recipientAddress = getAccountAddress(merchant2, orderId1, this.wallet.address)

        expect(senderAddress1).to.not.equal(senderAddress2)

        // Set merchant owner (both accounts)
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Do ERC20 transfer to smart accounts
        await this.token.transfer(senderAddress1, new BN(1), { from: owner })
        expect(await this.token.balanceOf(senderAddress1)).to.be.bignumber.equal(new BN(1))
        await this.token.transfer(senderAddress2, new BN(1), { from: owner })
        expect(await this.token.balanceOf(senderAddress2)).to.be.bignumber.equal(new BN(1))

        // Set premission for B2B (same merchant account)
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
        
        // Transfer from smart account 1
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))   

        // Transfer from smart account 2
        await this.wallet.transferB2B(this.token.address, merchant1, orderId2, merchant2, orderId1, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(2)) 
      })

      it("allows merchant owner to transfer from a associated smart account multiple times", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)
        const recipientAddress = getAccountAddress(merchant2, orderId1, this.wallet.address)

        // Set merchant owner "merchant"
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Set premission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)

        // Do ERC20 transfer to smart account
        await this.token.transfer(senderAddress, new BN(2), { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(2))
        
        // Transfer from smart account
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))   

        // Transfer from smart account
        await this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(2)) 
      })

      it("rejects payment transfers with amount 0", async function () {      
        await expectRevert(
          this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(0), { from: merchantOwner1 }),
          'ZippieSmartWalletERC20: Amount must be greater than 0'
        )
      })

      it("rejects to transfer payment tokens from associated smart accounts if amount exceeds balance", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)
        const recipientAddress = getAccountAddress(merchant2, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Set premission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
        
        // Try to transfer from smart account with amount greater than balance
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(2), { from: merchantOwner1 }),
          "ERC20: transfer amount exceeds balance"
        )
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
      })

      it("deploys and kills a new smart account contract when payment transfer is done first time", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)
        const recipientAddress = getAccountAddress(merchant2, orderId1, this.wallet.address)
        
        // Check account address calculation
        const salt = web3.utils.soliditySha3(merchant1, orderId1)
        const accountAddressSolidity = await this.wallet.getAccountAddress(salt, { from: owner })
        assert(senderAddress === accountAddressSolidity, "account address calculation didn't match")
        
        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Set premission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)

        // Do ERC20 transfer to smart account
        await this.token.transfer(senderAddress, new BN(2), { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(2))
        
        // Transfer payment from smart account
        expect(await this.token.allowance(senderAddress, this.wallet.address)).to.be.bignumber.equal(new BN(0))
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        const transferPaymentTx1 = await this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))   
        expect(await this.token.allowance(senderAddress, this.wallet.address)).to.be.bignumber.above(new BN(0))

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
        const transferPaymentTx2 = await this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(2)) 
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(0))

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

    describe('transferB2C', function() {
      it("allows merchant owner to transfer from associated smart accounts if merchant has B2C premission", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Set premission for B2C
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)
        
        // Transfer from smart account to consumer
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        const receipt = await this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(1), { from: merchantOwner1 })
        expectEvent(receipt, 'TransferB2C', { 
          token: this.token.address, 
          senderMerchant: merchant1, 
          senderOrderId: orderId1, 
          sender: senderAddress, 
          recipient: recipientConsumer, 
          amount: new BN(1) 
        })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1))
      })

      it("prevents merchant non-owners to transfer from associated smart accounts", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.not.equal(other)
        
        // Try to transfer from smart account with "other" (non-owner)
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(1), { from: other }),
          'ZippieSmartWalletERC20: Sender not merchant owner'
        )
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
      })

      it("prevents to transfer from associated smart accounts before merchant owner is set", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        
        // Merchant owner not set
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(ZERO_ADDRESS)

        // Try to transfer from smart account before merchant owner is set
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(1), { from: merchantOwner1 }),
          'ZippieSmartWalletERC20: Merchant owner not set'
        )
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
      })

      it("prevents to transfer from associated smart accounts if merchant has not B2B premission", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        
        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Hss not premission for B2C
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(false)

        // Try to transfer from smart account before merchant owner is set
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(1), { from: merchantOwner1 }),
          'ZippieSmartWalletERC20: Sender missing required premission to tranfer B2'
        )
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
      })

      it("allows a merchant owner to manage multiple smart account using same merchant account but different orderIds", async function () {
        // Get smart accounts
        const senderAddress1 = getAccountAddress(merchant1, orderId1, this.wallet.address)
        const senderAddress2 = getAccountAddress(merchant1, orderId2, this.wallet.address)

        expect(senderAddress1).to.not.equal(senderAddress2)

        // Set merchant owner (both accounts)
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Do ERC20 transfer to smart accounts
        await this.token.transfer(senderAddress1, new BN(1), { from: owner })
        expect(await this.token.balanceOf(senderAddress1)).to.be.bignumber.equal(new BN(1))
        await this.token.transfer(senderAddress2, new BN(1), { from: owner })
        expect(await this.token.balanceOf(senderAddress2)).to.be.bignumber.equal(new BN(1))

        // Set premission for B2C (same merchant account)
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)
        
        // Transfer from smart account 1
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1))   

        // Transfer from smart account 2
        await this.wallet.transferB2C(this.token.address, merchant1, orderId2, recipientConsumer, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(2)) 
      })

      it("allows merchant owner to transfer from a associated smart account multiple times", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)

        // Set merchant owner "merchant"
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Set premission for B2C
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)

        // Do ERC20 transfer to smart account
        await this.token.transfer(senderAddress, new BN(2), { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(2))
        
        // Transfer from smart account
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1))   

        // Transfer from smart account
        await this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(2)) 
      })

      it("rejects payment transfers with amount 0", async function () {      
        await expectRevert(
          this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(0), { from: merchantOwner1 }),
          'ZippieSmartWalletERC20: Amount must be greater than 0'
        )
      })

      it("rejects to transfer payment tokens from associated smart accounts if amount exceeds balance", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Set premission for B2C
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)
        
        // Try to transfer from smart account with amount greater than balance
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(2), { from: merchantOwner1 }),
          "ERC20: transfer amount exceeds balance"
        )
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
      })

      it("deploys and kills a new smart account contract when payment transfer is done first time", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)
        
        // Check account address calculation
        const salt = web3.utils.soliditySha3(merchant1, orderId1)
        const accountAddressSolidity = await this.wallet.getAccountAddress(salt, { from: owner })
        assert(senderAddress === accountAddressSolidity, "account address calculation didn't match")
        
        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Set premission for B2C
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)

        // Do ERC20 transfer to smart account
        await this.token.transfer(senderAddress, new BN(2), { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(2))
        
        // Transfer payment from smart account
        expect(await this.token.allowance(senderAddress, this.wallet.address)).to.be.bignumber.equal(new BN(0))
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        const transferPaymentTx1 = await this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1))   
        expect(await this.token.allowance(senderAddress, this.wallet.address)).to.be.bignumber.above(new BN(0))

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
        const transferPaymentTx2 = await this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(1), { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(2)) 
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(0))

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
    describe('transferB2B & transferB2C', function() {
      it("allows merchant owner to transfer from associated smart accounts if merchant has B2B and B2C premission", async function () {
        // Get smart account addresses	
        const senderAddress = getAccountAddress(merchant1, orderId1, this.wallet.address)
        const recipientAddress = getAccountAddress(merchant2, orderId1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(2), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(2) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(2))

        // Set merchant owner
        await this.merchantRegistry.setMerchantOwner(merchant1, merchantOwner1, { from: admin })
        expect(await this.merchantRegistry.merchantOwner(merchant1)).to.equal(merchantOwner1)

        // Set premission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)

        // Set premission for B2C
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)
        
        // Transfer from smart account to another merchant smart account
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        const receipt1 = await this.wallet.transferB2B(this.token.address, merchant1, orderId1, merchant2, orderId1, new BN(1), { from: merchantOwner1 })
        expectEvent(receipt1, 'TransferB2B', { 
          token: this.token.address, 
          senderMerchant: merchant1, 
          senderOrderId: orderId1, 
          sender: senderAddress, 
          recipientMerchant: merchant2, 
          recipientOrderId: orderId1, 
          recipient: recipientAddress, 
          amount: new BN(1) 
        })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))

        // Transfer from smart account to consumer
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        const receipt2 = await this.wallet.transferB2C(this.token.address, merchant1, orderId1, recipientConsumer, new BN(1), { from: merchantOwner1 })
        expectEvent(receipt2, 'TransferB2C', { 
          token: this.token.address, 
          senderMerchant: merchant1, 
          senderOrderId: orderId1, 
          sender: senderAddress, 
          recipient: recipientConsumer, 
          amount: new BN(1) 
        })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1))
      })
    })
  })
})
