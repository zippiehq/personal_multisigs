const { BN, constants, expectEvent, shouldFail } = require("openzeppelin-test-helpers");
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
      const name = await rewardToken.methods.name().call()
      name.should.be.equal("Reward Token (XYZ)");

      const symbol = await rewardToken.methods.symbol().call()
      symbol.should.be.equal("REWARD-XYZ");

      const decimals = await rewardToken.methods.decimals().call()
      decimals.should.be.equal("6");
    });

    it("sets correct owner", async function () {
      const owner = await rewardToken.methods.owner().call()
      owner.should.be.equal(owner);
    });

    it("sets correct minter", async function () {
      const creatorIsMinter = await rewardToken.methods.isMinter(creator).call()
      creatorIsMinter.should.be.equal(false);

      const ownerIsMinter = await rewardToken.methods.isMinter(owner).call()
      ownerIsMinter.should.be.equal(true);

      const factoryIsMinter = await rewardToken.methods.isMinter(this.rewardTokenFactory.address).call()
      factoryIsMinter.should.be.equal(false);
    });

    it("sets correct pauser", async function () {
      const creatorIsPauser = await rewardToken.methods.isPauser(creator).call()
      creatorIsPauser.should.be.equal(false);

      const ownerIsPauser = await rewardToken.methods.isPauser(owner).call()
      ownerIsPauser.should.be.equal(true);

      const factoryIsPauser = await rewardToken.methods.isPauser(this.rewardTokenFactory.address).call()
      factoryIsPauser.should.be.equal(false);
    });

    it("mints reqested amount of tokens to inital owner", async function () {
      const totalSupply = await rewardToken.methods.totalSupply().call()
      totalSupply.should.be.equal('1000000');

      const balanceCreator = await rewardToken.methods.balanceOf(creator).call()
      balanceCreator.should.be.equal('0');

      const balanceOwner = await rewardToken.methods.balanceOf(owner).call()
      balanceOwner.should.be.equal('1000000');

      const balanceFactory = await rewardToken.methods.balanceOf(this.rewardTokenFactory.address).call()
      balanceFactory.should.be.equal('0');
    });

    it("uses gas", async function () {
      console.log(this.rewardTokenFactory.address)
      console.log(`Gas used for deploy: ${deployReceipt.gasUsed}`)	
    });

  })
});