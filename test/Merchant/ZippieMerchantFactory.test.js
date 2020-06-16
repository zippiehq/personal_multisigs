const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { expect } = require('chai');
const ZippieMerchantFactory = artifacts.require("ZippieMerchantFactory");
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")

const CONTENT_HASH = '0x0000000000000000000000000000000000000000000000000000000000000001'

contract("ZippieMerchantFactory", ([creator, admin, owner, merchant1]) => {

  beforeEach(async function () {
    this.zippieMerchantFactory = await ZippieMerchantFactory.new();
  });

  describe('Deploying new Zippie Merchant Owner', function() {
    let deployLogs, deployReceipt

    beforeEach(async function () {
      this.merchantRegistry = await ZippieMerchantRegistry.new({ from: admin })
      const { logs, receipt } = await this.zippieMerchantFactory.deployMerchantOwner(owner, merchant1, this.merchantRegistry.address, CONTENT_HASH, { from: creator });
      deployLogs = logs
      deployReceipt = receipt
    });

    it("emits event with deploy details", async function () {
      expectEvent.inLogs(deployLogs, "MerchantOwnerDeployed", { owner: owner, merchantId: merchant1 });
    });
  })
});
