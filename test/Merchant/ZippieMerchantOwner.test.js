const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers")
const { expect } = require('chai')
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")
const ZippieSmartWalletERC20 = artifacts.require("ZippieSmartWalletERC20")
const ZippieMerchantOwner = artifacts.require("ZippieMerchantOwner")
const BasicERC20Mock = artifacts.require("BasicERC20Mock")

const ENS = artifacts.require("@ensdomains/ens/ENSRegistry");
const FIFSRegistrar = artifacts.require("@ensdomains/ens/FIFSRegistrar");
const ReverseRegistrar = artifacts.require("@ensdomains/ens/ReverseRegistrar");
const PublicResolver = artifacts.require("@ensdomains/resolver/PublicResolver");
const utils = require('web3-utils');
const namehash = require('eth-ens-namehash');

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

contract("ZippieMerchantOwner", ([owner, operator, admin, merchantOwner1, merchant1, merchantOwner2, merchant2, other, recipientConsumer]) => {

  beforeEach(async function () {
    this.ens = await ENS.new({ from: owner });
    this.resolver = await PublicResolver.new(this.ens.address, { from: owner });
    this.registrar = await FIFSRegistrar.new(this.ens.address, namehash.hash('merchant'), { from: owner });
    this.reverseRegistrar = await ReverseRegistrar.new(this.ens.address, this.resolver.address, { from: owner })
    await this.ens.setSubnodeOwner("0x0000000000000000000000000000000000000000", utils.sha3("resolver"), owner, { from: owner });
    await this.ens.setResolver(namehash.hash("resolver"), this.resolver.address, { from: owner });
    await this.resolver.methods['setAddr(bytes32,address)'](namehash.hash("resolver"), this.resolver.address, { from: owner });
    await this.ens.setSubnodeOwner("0x0000000000000000000000000000000000000000", utils.sha3('merchant'), this.registrar.address, { from: owner });
    await this.ens.setSubnodeOwner("0x0000000000000000000000000000000000000000", utils.sha3("reverse"), owner, { from: owner });
    await this.ens.setSubnodeOwner(namehash.hash("reverse"), utils.sha3("addr"), this.reverseRegistrar.address, { from: owner });
    
    this.merchantRegistry = await ZippieMerchantRegistry.new({ from: admin })
    this.wallet = await ZippieSmartWalletERC20.new(this.merchantRegistry.address, { from: owner })
    this.token = await BasicERC20Mock.new(owner, { from: owner })

    this.merchantOwner = await ZippieMerchantOwner.new(
      owner,
      operator,
      merchant1, 
      this.ens.address, 
      this.registrar.address,
      this.resolver.address, 
      web3.utils.sha3('app'), 
      namehash.hash('app.merchant'),
      { from: owner }
    )
  })

  describe('ZippieSmartWalletERC20', function() {
    it("allows owner to transferB2B from smart wallet", async function () {
      // Get smart account addresses	
      const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
      const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
      expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

      // Check permission
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

    it("allows owner to transferB2C from smart wallet", async function () {
      // Get smart account addresses	
      const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
      expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

      // Check permission
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

    it("allows owner to grant roles for smart wallet", async function () {
      expect(await this.merchantOwner.hasRole(PREMISSION_B2B, other)).to.equal(false)
      const receipt = await this.merchantOwner.grantRole(PREMISSION_B2B, other, { from: owner })
      expectEvent(receipt, 'RoleGranted', { account: other, role: PREMISSION_B2B, sender: owner })
      expect(await this.merchantOwner.hasRole(PREMISSION_B2B, other)).to.equal(true)

      expect(await this.merchantOwner.hasRole(PREMISSION_B2C, other)).to.equal(false)
      const receipt2 = await this.merchantOwner.grantRole(PREMISSION_B2C, other, { from: owner })
      expectEvent(receipt2, 'RoleGranted', { account: other, role: PREMISSION_B2C, sender: owner })
      expect(await this.merchantOwner.hasRole(PREMISSION_B2C, other)).to.equal(true)
    })

    it("allows operator to transferB2B from smart wallet", async function () {
      // Get smart account addresses	
      const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)
      const recipientAddress = getSmartWalletAccountAddress(merchant2, ORDER_ID_1, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
      expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

      // Check permission
      expect(await this.merchantOwner.hasRole(PREMISSION_B2B, operator)).to.equal(true)

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
      const { v, r, s } = await getTransferB2BSignature(operator, this.token.address, merchant1, ORDER_ID_1, merchant2, ORDER_ID_1, "1")
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

    it("allows operator to transferB2C from smart wallet", async function () {
      // Get smart account addresses	
      const senderAddress = getSmartWalletAccountAddress(merchant1, ORDER_ID_1, this.wallet.address)

      // Do ERC20 transfer to smart account
      const { logs } = await this.token.transfer(senderAddress, new BN(1), { from: owner })
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: senderAddress, value: new BN(1) })
      expect(await this.token.balanceOf(senderAddress)).to.be.bignumber.equal(new BN(1))

      // Check permission
      expect(await this.merchantOwner.hasRole(PREMISSION_B2C, operator)).to.equal(true)

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
      const { v, r, s } = await getTransferB2CSignature(operator, this.token.address, merchant1, ORDER_ID_1, recipientConsumer, "1")
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

    it("allows operator to grant roles for smart wallet", async function () {
      expect(await this.merchantOwner.hasRole(PREMISSION_B2B, other)).to.equal(false)
      const receipt = await this.merchantOwner.grantRole(PREMISSION_B2B, other, { from: operator })
      expectEvent(receipt, 'RoleGranted', { account: other, role: PREMISSION_B2B, sender: operator })
      expect(await this.merchantOwner.hasRole(PREMISSION_B2B, other)).to.equal(true)
  
      expect(await this.merchantOwner.hasRole(PREMISSION_B2C, other)).to.equal(false)
      const receipt2 = await this.merchantOwner.grantRole(PREMISSION_B2C, other, { from: operator })
      expectEvent(receipt2, 'RoleGranted', { account: other, role: PREMISSION_B2C, sender: operator })
      expect(await this.merchantOwner.hasRole(PREMISSION_B2C, other)).to.equal(true)
    })
  })
})