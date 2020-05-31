const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers")
const { expect } = require('chai')
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")
const ZippieSmartWalletERC20 = artifacts.require("ZippieSmartWalletERC20")
const ZippieCardNonces = artifacts.require("ZippieCardNonces.sol")
const ZippieWalletERC20 = artifacts.require("ZippieWalletERC20")
const BasicERC20Mock = artifacts.require("BasicERC20Mock")

const { 
  getSmartWalletAccountAddress,  
} = require('./HelpFunctions')

const {
	getAccountAddress,
	getRecipientSignature,
	getBlankCheckSignature,
  getSignatureNoCard,
	ZERO_ADDRESS,
 } = require("../../Wallet/ERC20/HelpFunctions");

const ORDER_ID_1 = "0x0000000000000000000000000000000000000000000000000000000000000001"

contract("ZippieSmartWalletERC20", ([owner, admin, merchant1, signer, verificationKey, sponsor]) => {

  beforeEach(async function () {
    this.merchantRegistry = await ZippieMerchantRegistry.new({ from: admin })
    this.wallet = await ZippieSmartWalletERC20.new(this.merchantRegistry.address, { from: owner })
    
    this.cards = await ZippieCardNonces.new({ from: owner })
    this.zippieWallet = await ZippieWalletERC20.new(this.cards.address, { from: owner })
    
    this.token = await BasicERC20Mock.new(owner, { from: owner })
  })

  describe('ZippieSmartWalletERC20', function() {
    describe('redeeemBlankCheckToMerchant', function() {
      it("should allow a blank check to be cashed to a merchant account", async function () {
        // Get smart account addresses	
        const recipientMerchant = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

        const signers = [signer]
        const m = [1, 1, 0, 0]
        const multisig = getAccountAddress(signers, m, this.zippieWallet.address)
        await this.token.transfer(multisig, web3.utils.toWei("2", "ether"), {from: owner});
        const addresses = [this.token.address, recipientMerchant, verificationKey]
    
        const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1", addresses[0])
        const recipientSignature = await getRecipientSignature(recipientMerchant, verificationKey)
        const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)
        expect(await this.token.balanceOf(multisig)).to.be.bignumber.equal(web3.utils.toWei("2", "ether"))
        assert(await this.zippieWallet.usedNonces(multisig, verificationKey) === ZERO_ADDRESS, "check already marked as cashed before transfer")
        
        const amount = web3.utils.toWei("1", "ether")
        expect(await this.token.balanceOf(recipientMerchant)).to.be.bignumber.equal(new BN(0))

        const receipt = await this.wallet.redeemBlankCheckToMerchant(
          { addresses: addresses, signers: signers, m: m, v: signature.v, r: signature.r, s: signature.s, amount: amount, cardNonces: [] }, 
          merchant1,
          ORDER_ID_1,
          this.zippieWallet.address, 
          { from: sponsor }
        )

        expectEvent(receipt, 'TransferC2B', { 
          token: this.token.address, 
          sender: multisig, 
          recipientMerchant: merchant1, 
          recipientOrderId: ORDER_ID_1, 
          recipient: recipientMerchant, 
          amount: amount
        })

        expect(await this.token.balanceOf(recipientMerchant)).to.be.bignumber.equal(amount)
        expect(await this.token.balanceOf(multisig)).to.be.bignumber.equal(web3.utils.toWei("1", "ether"))

        await expectRevert(
          this.wallet.redeemBlankCheckToMerchant(
            { addresses: addresses, signers: signers, m: m, v: signature.v, r: signature.r, s: signature.s, amount: amount, cardNonces: [] }, 
            merchant1,
            ORDER_ID_1,
            this.zippieWallet.address, 
            { from: sponsor }
          ),
          "Nonce already used."
        )
      })
    })
  })
})
