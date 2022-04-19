const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers")
const { expect } = require('chai')
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")
const ZippieSmartWalletERC721 = artifacts.require("ZippieSmartWalletERC721")
const BasicERC721Mock = artifacts.require("BasicERC721Mock")
const { 
  ZERO_ADDRESS,
  getSmartWalletAccountAddress,  
} = require('./HelpFunctions')

const ORDER_ID_1 = "0x0000000000000000000000000000000000000000000000000000000000000001"
const ORDER_ID_2 = "0x0000000000000000000000000000000000000000000000000000000000000002"
const CONTENT_HASH = '0x0000000000000000000000000000000000000000000000000000000000000001'
const TRANSFER_B2B = web3.utils.sha3("TRANSFER_B2B")
const TRANSFER_B2C = web3.utils.sha3("TRANSFER_B2C")

contract("ZippieSmartWalletERC721", ([owner, admin, merchantOwner1, merchant1, merchantOwner2, merchant2, other, recipientConsumer]) => {

  beforeEach(async function () {
    this.merchantRegistry = await ZippieMerchantRegistry.new({ from: admin })
    this.wallet = await ZippieSmartWalletERC721.new(this.merchantRegistry.address, { from: owner })
    this.token = await BasicERC721Mock.new(owner, { from: owner })
  })

  describe('ZippieSmartWalletERC721', function() {
    describe('transferB2B', function() {
      it("allows merchant owner to transfer from associated smart accounts if merchant has B2B permission", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        const { logs } = await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, tokenId: "1" })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)

        // Set merchant owner
        const receipt1 = await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expectEvent(receipt1, 'MerchantChanged', { 
          merchant: merchant1,
          owner: merchantOwner1,
          contentHash: CONTENT_HASH
        })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Set permission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
        
        // Transfer from smart account to another merchant smart account
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        const receipt2 = await this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "1", { from: merchantOwner1 })
        expectEvent(receipt2, 'TransferB2B', { 
          token: this.token.address, 
          senderMerchant: merchant1, 
          senderOrderId: ORDER_ID_1, 
          sender: senderAddress, 
          recipientMerchant: merchant2, 
          recipientOrderId: ORDER_ID_1, 
          recipient: recipientAddress, 
          tokenId: "1"
        })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(recipientAddress)
      })

      it("prevents merchant non-owners to transfer from associated smart accounts", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        const { logs } = await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, tokenId: "1" })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)

        // Set merchant owner
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)
        expect(await this.merchantRegistry.owner(merchant1)).to.not.equal(other)
        
        // Try to transfer from smart account with "other" (non-owner)
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchantOwner1, ORDER_ID_2, "1", { from: other }),
          'ZippieSmartWalletERC721: Sender not merchant owner'
        )
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
      })

      it("prevents to transfer from associated smart accounts before merchant owner is set", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        const { logs } = await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, tokenId: "1" })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        
        // Merchant owner not set
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(ZERO_ADDRESS)

        // Try to transfer from smart account before merchant owner is set
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "1", { from: merchantOwner1 }),
          'ZippieSmartWalletERC721: Merchant owner not set'
        )
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
      })

      it("prevents to transfer from associated smart accounts if merchant has not B2B permission", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        const { logs } = await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, tokenId: "1" })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        
        // Set merchant owner
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Hss not permission for B2B
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(false)

        // Try to transfer from smart account before merchant owner is set
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "1", { from: merchantOwner1 }),
          'ZippieSmartWalletERC721: Sender missing required permission to transfer B2B'
        )
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
      })

      it("allows a merchant owner to manage multiple smart account using same merchant account but different orderIds", async function () {
        // Get smart accounts
        const senderAddress1 = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const senderAddress2 = getSmartWalletAccountAddress(merchant1, ORDER_ID_2, this.wallet.address)
        const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

        expect(senderAddress1).to.not.equal(senderAddress2)

        // Set merchant owner (both accounts)
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Do ERC721 transfer to smart accounts
        await this.token.transferFrom(owner, senderAddress1, "1", { from: owner })
        expect(await this.token.balanceOf(senderAddress1)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress1)
        await this.token.transferFrom(owner, senderAddress2, "2", { from: owner })
        expect(await this.token.balanceOf(senderAddress2)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("2")).to.equal(senderAddress2)

        // Set permission for B2B (same merchant account)
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
        
        // Transfer from smart account 1
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "1", { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))   
        expect(await this.token.ownerOf("1")).to.equal(recipientAddress)

        // Transfer from smart account 2
        await this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_2, merchant2, ORDER_ID_1, "2", { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(2)) 
        expect(await this.token.ownerOf("2")).to.equal(recipientAddress)
      })

      it("allows merchant owner to transfer from a associated smart account multiple times", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

        // Set merchant owner "merchant"
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Set permission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)

        // Do ERC721 transfer to smart account
        await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        await this.token.transferFrom(owner, senderAddress, "2", { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(2))
        expect(await this.token.ownerOf("2")).to.equal(senderAddress)
        
        // Transfer from smart account
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "1", { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))   
        expect(await this.token.ownerOf("1")).to.equal(recipientAddress)

        // Transfer from smart account
        await this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "2", { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(2)) 
        expect(await this.token.ownerOf("2")).to.equal(recipientAddress)
      })

      it("rejects to transfer payment tokens from associated smart accounts if not owner of tokenId", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        const { logs } = await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, tokenId: "1" })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        expect(await this.token.ownerOf("2")).to.not.equal(senderAddress)

        // Set merchant owner
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Set permission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
        
        // Try to transfer from smart account with a tokenId the account is not owner of 
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "2", { from: merchantOwner1 }),
          "ERC721: transfer caller is not owner nor approved"
        )
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)

        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        expect(await this.token.ownerOf("2")).to.not.equal(recipientAddress)

      })

      it("deploys and kills a new smart account contract when payment transfer is done first time", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)
        
        // Check account address calculation
        const salt = web3.utils.soliditySha3(merchant1, ORDER_ID_1)
        const accountAddressSolidity = await this.wallet.getAccountAddress(salt, { from: owner })
        assert(senderAddress === accountAddressSolidity, "account address calculation didn't match")
        
        // Set merchant owner
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Set permission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)

        // Do ERC721 transfer to smart account
        await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        await this.token.transferFrom(owner, senderAddress, "2", { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(2))
        expect(await this.token.ownerOf("2")).to.equal(senderAddress)
        
        // Transfer payment from smart account
        expect(await this.token.isApprovedForAll(senderAddress, this.wallet.address)).to.equal(false)
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        const transferPaymentTx1 = await this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "1", { from: merchantOwner1 })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))   
        expect(await this.token.ownerOf("1")).to.equal(recipientAddress)
        expect(await this.token.isApprovedForAll(senderAddress, this.wallet.address)).to.equal(true)

        // Check events for first transfer (account created / approval event)
        assert(transferPaymentTx1.receipt.rawLogs.some(log => { 
          return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
          && log.topics[3] === '0x0000000000000000000000000000000000000000000000000000000000000001'
        }) === true, "missing Transfer event")
        assert(transferPaymentTx1.receipt.rawLogs.some(log => { 
          return log.topics[0] === web3.utils.sha3("ApprovalForAll(address,address,bool)") 
          && log.data === '0x0000000000000000000000000000000000000000000000000000000000000001' 
        }) === true, "missing Approval event")
  

        // Transfer payment from smart account to recipient
        const transferPaymentTx2 = await this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "2", { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(2)) 
        expect(await this.token.ownerOf("2")).to.equal(recipientAddress)
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(0))

        // Check events for second transfer (account should not be crated / no approval event)
        assert(transferPaymentTx2.receipt.rawLogs.some(log => { 
          return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
          && log.topics[3] === '0x0000000000000000000000000000000000000000000000000000000000000002'
        }) === true, "missing Transfer event")
        assert(transferPaymentTx2.receipt.rawLogs.some(log => { 
          return log.topics[0] === web3.utils.sha3("ApprovalForAll(address,address,bool)") 
          && log.data === '0x0000000000000000000000000000000000000000000000000000000000000001' 
        }) === false, "unexpectd Approval event")
        
        console.log(`Gas used for transferPayment w/ createAccount: ${transferPaymentTx1.receipt.gasUsed}`)
        console.log(`Gas used for transferPayment w/o createAccount: ${transferPaymentTx2.receipt.gasUsed}`)
      })
    })

    describe('transferB2C', function() {
      it("allows merchant owner to transfer from associated smart accounts if merchant has B2C permission", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        const { logs } = await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, tokenId: "1" })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)

        // Set merchant owner
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Set permission for B2C
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)
        
        // Transfer from smart account to consumer
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        const receipt = await this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "1", { from: merchantOwner1 })
        expectEvent(receipt, 'TransferB2C', { 
          token: this.token.address, 
          senderMerchant: merchant1, 
          senderOrderId: ORDER_ID_1, 
          sender: senderAddress, 
          recipient: recipientConsumer, 
          tokenId: "1"
        })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(recipientConsumer)
      })

      it("prevents merchant non-owners to transfer from associated smart accounts", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        const { logs } = await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, tokenId: "1" })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)

        // Set merchant owner
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)
        expect(await this.merchantRegistry.owner(merchant1)).to.not.equal(other)
        
        // Try to transfer from smart account with "other" (non-owner)
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "1", { from: other }),
          'ZippieSmartWalletERC721: Sender not merchant owner'
        )
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
      })

      it("prevents to transfer from associated smart accounts before merchant owner is set", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        const { logs } = await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, tokenId: "1" })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        
        // Merchant owner not set
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(ZERO_ADDRESS)

        // Try to transfer from smart account before merchant owner is set
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "1", { from: merchantOwner1 }),
          'ZippieSmartWalletERC721: Merchant owner not set'
        )
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
      })

      it("prevents to transfer from associated smart accounts if merchant has not B2B permission", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        const { logs } = await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, tokenId: "1" })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        
        // Set merchant owner
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Hss not permission for B2C
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(false)

        // Try to transfer from smart account before merchant owner is set
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "1", { from: merchantOwner1 }),
          'ZippieSmartWalletERC721: Sender missing required permission to transfer B2C'
        )
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
      })

      it("allows a merchant owner to manage multiple smart account using same merchant account but different orderIds", async function () {
        // Get smart accounts
        const senderAddress1 = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const senderAddress2 = getSmartWalletAccountAddress(merchant1, ORDER_ID_2, this.wallet.address)

        expect(senderAddress1).to.not.equal(senderAddress2)

        // Set merchant owner (both accounts)
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Do ERC721 transfer to smart accounts
        await this.token.transferFrom(owner, senderAddress1, "1", { from: owner })
        expect(await this.token.balanceOf(senderAddress1)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress1)
        await this.token.transferFrom(owner, senderAddress2, "2", { from: owner })
        expect(await this.token.balanceOf(senderAddress2)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("2")).to.equal(senderAddress2)


        // Set permission for B2C (same merchant account)
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)
        
        // Transfer from smart account 1
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "1", { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1)) 
        expect(await this.token.ownerOf("1")).to.equal(recipientConsumer)

        // Transfer from smart account 2
        await this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_2, recipientConsumer, "2", { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(2)) 
        expect(await this.token.ownerOf("2")).to.equal(recipientConsumer)
      })

      it("allows merchant owner to transfer from a associated smart account multiple times", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

        // Set merchant owner "merchant"
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Set permission for B2C
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)

        // Do ERC721 transfer to smart account
        await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        await this.token.transferFrom(owner, senderAddress, "2", { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(2))
        expect(await this.token.ownerOf("2")).to.equal(senderAddress)
        
        
        // Transfer from smart account
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "1", { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1))   
        expect(await this.token.ownerOf("1")).to.equal(recipientConsumer)

        // Transfer from smart account
        await this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "2", { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(2)) 
        expect(await this.token.ownerOf("2")).to.equal(recipientConsumer)
      })

      it("rejects to transfer payment tokens from associated smart accounts if not owner of tokenId", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        const { logs } = await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, tokenId: "1" })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        expect(await this.token.ownerOf("2")).to.not.equal(senderAddress)

        // Set merchant owner
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Set permission for B2C
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)
        
        // Try to transfer from smart account with amount greater than balance
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        await expectRevert(
          this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "2", { from: merchantOwner1 }),
          "ERC721: transfer caller is not owner nor approved"
        )
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)

        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        expect(await this.token.ownerOf("2")).to.not.equal(recipientConsumer)
      })

      it("deploys and kills a new smart account contract when payment transfer is done first time", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        
        // Check account address calculation
        const salt = web3.utils.soliditySha3(merchant1, ORDER_ID_1)
        const accountAddressSolidity = await this.wallet.getAccountAddress(salt, { from: owner })
        assert(senderAddress === accountAddressSolidity, "account address calculation didn't match")
        
        // Set merchant owner
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Set permission for B2C
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)

        // Do ERC721 transfer to smart account
        await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        await this.token.transferFrom(owner, senderAddress, "2", { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(2))
        expect(await this.token.ownerOf("2")).to.equal(senderAddress)
        
        // Transfer payment from smart account
        expect(await this.token.isApprovedForAll(senderAddress, this.wallet.address)).to.equal(false)
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        const transferPaymentTx1 = await this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "1", { from: merchantOwner1 })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1))   
        expect(await this.token.isApprovedForAll(senderAddress, this.wallet.address)).to.equal(true)

        // Check events for first transfer (account created / approval event)
        assert(transferPaymentTx1.receipt.rawLogs.some(log => { 
          return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
          && log.topics[3] === '0x0000000000000000000000000000000000000000000000000000000000000001'
        }) === true, "missing Transfer event")
        assert(transferPaymentTx1.receipt.rawLogs.some(log => { 
          return log.topics[0] === web3.utils.sha3("ApprovalForAll(address,address,bool)") 
          && log.data === '0x0000000000000000000000000000000000000000000000000000000000000001' 
        }) === true, "missing Approval event")

        // Transfer payment from smart account to recipient
        const transferPaymentTx2 = await this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "2", { from: merchantOwner1 })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(2)) 
        expect(await this.token.ownerOf("2")).to.equal(recipientConsumer)
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(0))

        // Check events for second transfer (account should not be crated / no approval event)
        assert(transferPaymentTx2.receipt.rawLogs.some(log => { 
          return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
          && log.topics[3] === '0x0000000000000000000000000000000000000000000000000000000000000002'
        }) === true, "missing Transfer event")
        assert(transferPaymentTx2.receipt.rawLogs.some(log => { 
          return log.topics[0] === web3.utils.sha3("ApprovalForAll(address,address,bool)") 
          && log.data === '0x0000000000000000000000000000000000000000000000000000000000000001' 
        }) === false, "unexpectd Approval event")
        
        console.log(`Gas used for transferPayment w/ createAccount: ${transferPaymentTx1.receipt.gasUsed}`)
        console.log(`Gas used for transferPayment w/o createAccount: ${transferPaymentTx2.receipt.gasUsed}`)
      })
    })
    describe('transferB2B & transferB2C', function() {
      it("allows merchant owner to transfer from associated smart accounts if merchant has B2B and B2C permission", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

        // Do ERC721 transfer to smart account
        await this.token.transferFrom(owner, senderAddress, "1", { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(senderAddress)
        await this.token.transferFrom(owner, senderAddress, "2", { from: owner })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(2))
        expect(await this.token.ownerOf("2")).to.equal(senderAddress)

        // Set merchant owner
        await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH, { from: admin })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)

        // Set permission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)

        // Set permission for B2C
        await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)
        
        // Transfer from smart account to another merchant smart account
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
        const receipt1 = await this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "1", { from: merchantOwner1 })
        expectEvent(receipt1, 'TransferB2B', { 
          token: this.token.address, 
          senderMerchant: merchant1, 
          senderOrderId: ORDER_ID_1, 
          sender: senderAddress, 
          recipientMerchant: merchant2, 
          recipientOrderId: ORDER_ID_1, 
          recipient: recipientAddress, 
          tokenId: "1" 
        })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("1")).to.equal(recipientAddress)


        // Transfer from smart account to consumer
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
        const receipt2 = await this.wallet.transferB2C(this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "2", { from: merchantOwner1 })
        expectEvent(receipt2, 'TransferB2C', { 
          token: this.token.address, 
          senderMerchant: merchant1, 
          senderOrderId: ORDER_ID_1, 
          sender: senderAddress, 
          recipient: recipientConsumer, 
          tokenId: "2"
        })
        expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.ownerOf("2")).to.equal(recipientConsumer)

      })
    })
  })
})
