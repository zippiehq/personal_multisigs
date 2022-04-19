const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { expect } = require('chai');
const ZippieMerchantFactory = artifacts.require("ZippieMerchantFactory");
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")

const ENS = artifacts.require("@ensdomains/ens/ENSRegistry");
const FIFSRegistrar = artifacts.require("@ensdomains/ens/FIFSRegistrar");
const ReverseRegistrar = artifacts.require("@ensdomains/ens/ReverseRegistrar");
const PublicResolver = artifacts.require("@ensdomains/resolver/PublicResolver");
const utils = require('web3-utils');
const namehash = require('eth-ens-namehash');

const CONTENT_HASH = '0x0000000000000000000000000000000000000000000000000000000000000001'


contract("ZippieMerchantFactory", ([owner, operator, merchant1, merchant2, app, other]) => {

  beforeEach(async function () {
    this.ens = await ENS.new({ from: owner });
    this.resolver = await PublicResolver.new(this.ens.address, { from: owner })
    this.registrar = await FIFSRegistrar.new(this.ens.address, namehash.hash('zippie'), { from: owner })
    this.registrar2 = await FIFSRegistrar.new(this.ens.address, namehash.hash('merchant'), { from: owner })
    this.reverseRegistrar = await ReverseRegistrar.new(this.ens.address, this.resolver.address, { from: owner })
    await this.ens.setSubnodeOwner("0x0000000000000000000000000000000000000000", utils.sha3("resolver"), owner, { from: owner })
    await this.ens.setResolver(namehash.hash("resolver"), this.resolver.address, { from: owner })
    await this.resolver.methods['setAddr(bytes32,address)'](namehash.hash("resolver"), this.resolver.address, { from: owner })
    await this.ens.setSubnodeOwner("0x0000000000000000000000000000000000000000", utils.sha3('zippie'), this.registrar.address, { from: owner })
    await this.ens.setSubnodeOwner("0x0000000000000000000000000000000000000000", utils.sha3('merchant'), this.registrar2.address, { from: owner })
    await this.ens.setSubnodeOwner("0x0000000000000000000000000000000000000000", utils.sha3("reverse"), owner, { from: owner })
    await this.ens.setSubnodeOwner(namehash.hash("reverse"), utils.sha3("addr"), this.reverseRegistrar.address, { from: owner })
    
    this.merchantRegistry = await ZippieMerchantRegistry.new({ from: owner })
    this.zippieMerchantFactory = await ZippieMerchantFactory.new(
      this.merchantRegistry.address, 
      this.ens.address,
      this.registrar2.address, 
      this.resolver.address,
      { from: owner }
    )
  })

  describe('ZippieMerchantOwner', function() {

    it("deploys merchant owner contract correctly", async function () {
      const receipt  = await this.zippieMerchantFactory.deployMerchantOwner(
        owner, 
        operator,
        merchant1, 
        CONTENT_HASH, 
        web3.utils.sha3('app'),  
        namehash.hash('app.merchant'),
        { from: owner }
      )
      
      const merchantOwnerContract = await this.merchantRegistry.owner(merchant1)
      expectEvent(receipt, "MerchantOwnerDeployed", { addr: merchantOwnerContract, owner: owner, merchantId: merchant1 })
      expect(await this.ens.resolver(namehash.hash('app.merchant'))).to.be.equal(this.resolver.address)
      expect(await this.resolver.addr(namehash.hash('app.merchant'))).to.be.equal(merchant1)
      expect(await this.ens.owner(namehash.hash('app.merchant'))).to.be.equal(merchantOwnerContract)
    })

    it("fails to deploy merchant owner contract if merchantId is already taken", async function () {
      expect(await this.merchantRegistry.contentHash(merchant1)).to.equal(null)
      await this.merchantRegistry.setMerchant(merchant1, owner, CONTENT_HASH, { from: owner })
      expect(await this.merchantRegistry.owner(merchant1)).to.equal(owner)

      await expectRevert(
         this.zippieMerchantFactory.deployMerchantOwner(
          owner, 
          operator,
          merchant1, 
          CONTENT_HASH, 
          web3.utils.sha3('app'),  
          namehash.hash('app.merchant'),
          { from: owner }
        ), 
        'ZippieMerchantRegistry: Caller is not admin'
      )
    })

    it("fails to deploy merchant owner contract if ens name is already taken", async function () {
      await this.registrar2.register(web3.utils.sha3('app'), owner, { from: owner })
      expect(await this.ens.owner(namehash.hash('app.merchant'))).to.be.equal(owner)

      await expectRevert.unspecified(
         this.zippieMerchantFactory.deployMerchantOwner(
          owner, 
          operator,
          merchant1, 
          CONTENT_HASH, 
          web3.utils.sha3('app'),  
          namehash.hash('app.merchant'),
          { from: owner }
        )
      )
    })

    it("allows ens name to be managed by operator", async function () {
      const receipt  = await this.zippieMerchantFactory.deployMerchantOwner(
        owner, 
        operator,
        merchant1, 
        CONTENT_HASH, 
        web3.utils.sha3('app'),  
        namehash.hash('app.merchant'),
        { from: owner }
      )
    
      const merchantOwnerContract = receipt.receipt.logs[0].args.addr 

      // Operator
      expect(await this.ens.isApprovedForAll(merchantOwnerContract, operator)).to.be.equal(true)
      
      // Addr
      expect(await this.resolver.addr(namehash.hash('app.merchant'))).to.be.equal(merchant1)
      await this.resolver.methods['setAddr(bytes32,address)'](namehash.hash('app.merchant'), merchant2, { from: operator })
      expect(await this.resolver.addr(namehash.hash('app.merchant'))).to.be.equal(merchant2)
      
      // Content hash
      expect(await this.resolver.contenthash(namehash.hash('app.merchant'))).to.be.equal(null)
      await this.resolver.methods['setContenthash(bytes32,bytes)'](namehash.hash('app.merchant'), '0x1337', { from: operator })
      expect(await this.resolver.contenthash(namehash.hash('app.merchant'))).to.be.equal('0x1337')
      
      // Owner
      expect(await this.ens.owner(namehash.hash('app.merchant'))).to.be.equal(merchantOwnerContract)
      await this.ens.setOwner(namehash.hash('app.merchant'), other, { from: operator })
      expect(await this.ens.owner(namehash.hash('app.merchant'))).to.be.equal(other)
    })
  })
})
