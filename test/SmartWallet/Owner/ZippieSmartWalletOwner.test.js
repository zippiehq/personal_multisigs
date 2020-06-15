const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers")
const { expect } = require('chai')
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")
const ZippieSmartWalletERC20 = artifacts.require("ZippieSmartWalletERC20")
const ZippieSmartWalletOwner = artifacts.require("ZippieSmartWalletOwner")
const BasicERC20Mock = artifacts.require("BasicERC20Mock")
const { 
  ZERO_ADDRESS,
  getSmartWalletAccountAddress,  
  getTransferB2BSignature,
} = require('./HelpFunctions')

const ORDER_ID_1 = "0x0000000000000000000000000000000000000000000000000000000000000001"
const ORDER_ID_2 = "0x0000000000000000000000000000000000000000000000000000000000000002"
const CONTENT_HASH = '0x0000000000000000000000000000000000000000000000000000000000000001'
const TRANSFER_B2B = web3.utils.sha3("TRANSFER_B2B")
const TRANSFER_B2C = web3.utils.sha3("TRANSFER_B2C")

contract("ZippieSmartWalletERC20", ([owner, admin, merchantOwner1, merchant1, merchantOwner2, merchant2, other, recipientConsumer]) => {

  beforeEach(async function () {
    this.merchantRegistry = await ZippieMerchantRegistry.new({ from: admin })
    this.wallet = await ZippieSmartWalletERC20.new(this.merchantRegistry.address, { from: owner })
    this.token = await BasicERC20Mock.new(owner, { from: owner })
    this.walletOwner = await ZippieSmartWalletOwner.new({ from: owner })
  })

  describe('ZippieSmartWalletOwnerERC20', function() {
    describe('transferB2B', function() {
      it("allows owner to transferB2B from owned smart wallet", async function () {
        // Get smart account addresses	
        const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
        const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

        // Do ERC20 transfer to smart account
        const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
        expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
        expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

        // Set merchant owner
        const receipt1 = await this.merchantRegistry.setMerchant(merchant1, this.walletOwner.address, CONTENT_HASH, { from: admin })
        expectEvent(receipt1, 'MerchantChanged', { 
          merchant: merchant1,
          owner: this.walletOwner.address,
          contentHash: CONTENT_HASH
        })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(this.walletOwner.address)

        // Set permission for B2B
        await this.merchantRegistry.grantRole(TRANSFER_B2B, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(TRANSFER_B2B, merchant1)).to.equal(true)
        
        // Transfer from smart account to another merchant smart account
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(0))

        // Tranfer using owner contract and sign as meta transaction
        const { v, r, s } = await getTransferB2BSignature(owner, this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "1")
        const receipt2 = await this.walletOwner.transferB2B(
          { token: this.token.address, senderMerchant: merchant1, senderOrderId: ORDER_ID_1, recipientMerchant: merchant2, recipientOrderId: ORDER_ID_1, amount: "1" },
          { v: v, r: r, s: s },
          this.wallet.address,
          { from: other }
        )
        // const receipt2 = await this.wallet.transferB2B(this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, new BN(1), { from: merchantOwner1 })
        // expectEvent(receipt2, 'TransferB2B', { 
        //   token: this.token.address, 
        //   senderMerchant: merchant1, 
        //   senderOrderId: ORDER_ID_1, 
        //   sender: senderAddress, 
        //   recipientMerchant: merchant2, 
        //   recipientOrderId: ORDER_ID_1, 
        //   recipient: recipientAddress, 
        //   amount: new BN(1) 
        // })
        expect(await this.token.balanceOf(recipientAddress)).to.be.bignumber.equal(new BN(1))
      })
    })
  })
})