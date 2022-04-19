const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers")
const { expect } = require('chai')
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")
const ZippieSmartWalletERC721 = artifacts.require("ZippieSmartWalletERC721")
const ZippieCardNonces = artifacts.require("ZippieCardNonces.sol")
const ZippieWalletERC721 = artifacts.require("ZippieWalletERC721")
const BasicERC721Mock = artifacts.require("BasicERC721Mock")

const { 
  getSmartWalletAccountAddress,  
} = require('./HelpFunctions')

const {
	getAccountAddress,
	getRecipientSignature,
	getBlankCheckSignature,
  getSignatureNoCard,
	ZERO_ADDRESS,
 } = require("../../Wallet/ERC721/HelpFunctions");

const ORDER_ID_1 = "0x0000000000000000000000000000000000000000000000000000000000000001"

contract("ZippieSmartWalletERC721", ([owner, admin, merchant1, signer, verificationKey, sponsor]) => {

  beforeEach(async function () {
    this.merchantRegistry = await ZippieMerchantRegistry.new({ from: admin })
    this.wallet = await ZippieSmartWalletERC721.new(this.merchantRegistry.address, { from: owner })
    
    this.cards = await ZippieCardNonces.new({ from: owner })
    this.zippieWallet = await ZippieWalletERC721.new(this.cards.address, { from: owner })
    
    this.token = await BasicERC721Mock.new(owner, { from: owner })
  })

  describe('ZippieSmartWalletERC721', function() {
    describe('redeeemBlankCheckToMerchant', function() {
      it("should allow a blank check to be cashed to a merchant account", async function () {
        // Get smart account addresses	
        const recipientMerchant = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

        const signers = [signer]
        const m = [1, 1, 0, 0]
        const multisig = getAccountAddress(signers, m, this.zippieWallet.address)
        await this.token.transferFrom(owner, multisig, "1", {from: owner});
        await this.token.transferFrom(owner, multisig, "2", {from: owner});
        const addresses = [this.token.address, recipientMerchant, verificationKey]
    
        const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1", addresses[0])
        const recipientSignature = await getRecipientSignature(recipientMerchant, verificationKey)
        const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)
        expect(await this.token.balanceOf(multisig)).to.be.bignumber.equal(new BN(2))
        expect(await this.token.ownerOf("1")).to.equal(multisig)
        expect(await this.token.ownerOf("2")).to.equal(multisig)

        assert(await this.zippieWallet.usedNonces(multisig, verificationKey) === ZERO_ADDRESS, "check already marked as cashed before transfer")
        
        expect(await this.token.balanceOf(recipientMerchant)).to.be.bignumber.equal(new BN(0))

        const receipt = await this.wallet.redeemBlankCheckToMerchant(
          { addresses: addresses, signers: signers, m: m, v: signature.v, r: signature.r, s: signature.s, tokenId: "1", cardNonces: [] }, 
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
          tokenId: "1"
        })

        expect(await this.token.balanceOf(recipientMerchant)).to.be.bignumber.equal(new BN(1))
        expect(await this.token.balanceOf(multisig)).to.be.bignumber.equal(new BN(1))

        await expectRevert(
          this.wallet.redeemBlankCheckToMerchant(
            { addresses: addresses, signers: signers, m: m, v: signature.v, r: signature.r, s: signature.s, tokenId: "2", cardNonces: [] }, 
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
