const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers")
const { expect } = require('chai')
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")
const ZippieSmartWalletERC20 = artifacts.require("ZippieSmartWalletERC20")
const ZippieMerchantOwner = artifacts.require("ZippieMerchantOwner")
const BasicERC20Mock = artifacts.require("BasicERC20Mock")
const { 
  ZERO_ADDRESS,
  getSmartWalletAccountAddress,  
  getTransferB2BSignature,
  getTransferB2CSignature,
} = require('./HelpFunctions')

const ORDER_ID_1 = "0x0000000000000000000000000000000000000000000000000000000000000001"
const ORDER_ID_2 = "0x0000000000000000000000000000000000000000000000000000000000000002"
const CONTENT_HASH = '0x0000000000000000000000000000000000000000000000000000000000000001'
const TRANSFER_B2B = web3.utils.sha3("TRANSFER_B2B")
const TRANSFER_B2C = web3.utils.sha3("TRANSFER_B2C")

const PREMISSION_B2B = web3.utils.sha3("transferB2B")
const PREMISSION_B2C = web3.utils.sha3("transferB2C")

contract("ZippieMerchantOwner", ([owner, admin, merchantOwner1, merchant1, merchantOwner2, merchant2, other, recipientConsumer]) => {

  beforeEach(async function () {
    this.merchantRegistry = await ZippieMerchantRegistry.new({ from: admin })
    this.wallet = await ZippieSmartWalletERC20.new(this.merchantRegistry.address, { from: owner })
    this.token = await BasicERC20Mock.new(owner, { from: owner })
    this.merchantOwner = await ZippieMerchantOwner.new(owner, { from: owner })
  })

  describe('ZippieSmartWalletERC20', function() {
    it("allows merchant owner to transferB2B from owned smart wallet", async function () {
      // Get smart account addresses	
      const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
      const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
      expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

      expect(await this.merchantOwner.hasRole(PREMISSION_B2B, owner)).to.equal(false)
      const receipt = await this.merchantOwner.grantRole(PREMISSION_B2B, owner, { from: owner })
      expectEvent(receipt, 'RoleGranted', { account: owner, role: PREMISSION_B2B, sender: owner })
      expect(await this.merchantOwner.hasRole(PREMISSION_B2B, owner)).to.equal(true)

      // Set merchant owner
      const receipt1 = await this.merchantRegistry.setMerchant(merchant1, this.merchantOwner.address, CONTENT_HASH, { from: admin })
      expectEvent(receipt1, 'MerchantChanged', { 
        merchant: merchant1,
        owner: this.merchantOwner.address,
        contentHash: CONTENT_HASH
      })
      expect(await this.merchantRegistry.owner(merchant1)).to.equal(this.merchantOwner.address)

      // Set permission for B2B
      await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
      expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
      
      
      // TransferB2B using owner contract and sign as meta transaction
      expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))
      const { v, r, s } = await getTransferB2BSignature(owner, this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "1")
      const receipt2 = await this.merchantOwner.transferB2B(
        { token: this.token.address, senderMerchant: merchant1, senderOrderId: ORDER_ID_1, recipientMerchant: merchant2, recipientOrderId: ORDER_ID_1, amount: "1" },
        { v: v, r: r, s: s },
        this.wallet.address,
        { from: other }
      )

      // Check events for transferB2B
      assert(receipt2.receipt.rawLogs.some(log => { 
        return log.topics[0] === web3.utils.sha3("TransferB2B(address,address,bytes32,address,address,bytes32,address,uint256)")
         && log.topics[1] === web3.utils.padLeft(this.token.address.toLowerCase(), 64)
         && log.topics[2] === web3.utils.padLeft(merchant1.toLowerCase(), 64)
         && log.topics[3] === web3.utils.padLeft(merchant2.toLowerCase(), 64)
      }) === true, "missing TransferB2B event")

      expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))
    })

    it("allows merchant owner to transferB2C from owned smart wallet", async function () {
      // Get smart account addresses	
      const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
      expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

      expect(await this.merchantOwner.hasRole(PREMISSION_B2C, owner)).to.equal(false)
      const receipt = await this.merchantOwner.grantRole(PREMISSION_B2C, owner, { from: owner })
      expectEvent(receipt, 'RoleGranted', { account: owner, role: PREMISSION_B2C, sender: owner })
      expect(await this.merchantOwner.hasRole(PREMISSION_B2C, owner)).to.equal(true)

      // Set merchant owner
      const receipt1 = await this.merchantRegistry.setMerchant(merchant1, this.merchantOwner.address, CONTENT_HASH, { from: admin })
      expectEvent(receipt1, 'MerchantChanged', { 
        merchant: merchant1,
        owner: this.merchantOwner.address,
        contentHash: CONTENT_HASH
      })
      expect(await this.merchantRegistry.owner(merchant1)).to.equal(this.merchantOwner.address)

      // Set permission for B2C
      await this.merchantRegistry.grantRole(TRANSFER_B2C, merchant1, { from: admin })
      expect(await this.merchantRegistry.hasRole(TRANSFER_B2C, merchant1)).to.equal(true)
      
      // TransferB2C using owner contract and sign as meta transaction
      expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(0))
      const { v, r, s } = await getTransferB2CSignature(owner, this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "1")
      const receipt2 = await this.merchantOwner.transferB2C(
        { token: this.token.address, senderMerchant: merchant1, senderOrderId: ORDER_ID_1, recipient: recipientConsumer, amount: "1" },
        { v: v, r: r, s: s },
        this.wallet.address,
        { from: other }
      )

      // Check events for transferB2B
      assert(receipt2.receipt.rawLogs.some(log => { 
        return log.topics[0] === web3.utils.sha3("TransferB2C(address,address,bytes32,address,address,uint256)")
         && log.topics[1] === web3.utils.padLeft(this.token.address.toLowerCase(), 64)
         && log.topics[2] === web3.utils.padLeft(merchant1.toLowerCase(), 64)
      }) === true, "missing TransferB2C event")
      expect(await this.token.balanceOf(recipientConsumer)).to.be.bignumber.equal(new BN(1))
    })
  })
})