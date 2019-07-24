const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { expect } = require('chai');
const ZippieRewardTokenERC20Factory = artifacts.require("ZippieRewardTokenERC20Factory");
const { abi:rewardTokenAbi, bytecode:rewardTokenBytecode } = require('../../../build/contracts/ZippieRewardTokenERC20.json')

contract("ZippieRewardTokenERC20Factory", ([creator, owner]) => {

  beforeEach(async function () {
    this.rewardTokenFactory = await ZippieRewardTokenERC20Factory.new();
  });

  describe('Deploying new Zippie Reward Token', function() {
    let deployLogs, deployReceipt, rewardToken

    beforeEach(async function () {
      const { logs, receipt } = await this.rewardTokenFactory.deployToken(owner, 'Reward Token (XYZ)', 'REWARD-XYZ', 6, 1000000, { from: creator });
      deployLogs = logs
      deployReceipt = receipt
      rewardToken = new web3.eth.Contract(rewardTokenAbi, deployLogs[0].args.addr)
    });

    it("emits event with deploy details", async function () {
      expectEvent.inLogs(deployLogs, "TokenDeployed", { name: "Reward Token (XYZ)", creator: creator, owner: owner, symbol: "REWARD-XYZ", decimals: new BN(6), amount: new BN(1000000) });
    });

    it("creates a token with correct details", async function () {
      expect(await rewardToken.methods.name().call()).to.be.equal("Reward Token (XYZ)");
      expect(await rewardToken.methods.symbol().call()).to.be.equal("REWARD-XYZ");
      expect(await rewardToken.methods.decimals().call()).to.be.equal("6");
    });

    it("sets correct owner", async function () {
      expect(await rewardToken.methods.owner().call()).to.be.equal(owner);
    });

    it("sets correct minter", async function () {
      expect(await rewardToken.methods.isMinter(creator).call()).to.be.equal(false);
      expect(await rewardToken.methods.isMinter(owner).call()).to.be.equal(true);
      expect(await rewardToken.methods.isMinter(this.rewardTokenFactory.address).call()).to.be.equal(false);
    });

    it("sets correct pauser", async function () {
      expect(await rewardToken.methods.isPauser(creator).call()).to.be.equal(false);
      expect(await rewardToken.methods.isPauser(owner).call()).to.be.equal(true);
      expect(await rewardToken.methods.isPauser(this.rewardTokenFactory.address).call()).to.be.equal(false);
    });

    it("mints reqested amount of tokens to inital owner", async function () {
      expect(await rewardToken.methods.totalSupply().call()).to.be.equal('1000000');
      expect(await rewardToken.methods.balanceOf(creator).call()).to.be.equal('0');
      expect(await rewardToken.methods.balanceOf(owner).call()).to.be.equal('1000000');
      expect(await rewardToken.methods.balanceOf(this.rewardTokenFactory.address).call()).to.be.equal('0');
    });

    it("uses gas", async function () {
      console.log(this.rewardTokenFactory.address)
      console.log(`Gas used for deploy: ${deployReceipt.gasUsed}`)	
    });

  })
});