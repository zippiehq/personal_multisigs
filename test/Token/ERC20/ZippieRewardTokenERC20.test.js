const { BN, constants, expectEvent, shouldFail } = require("openzeppelin-test-helpers");
const ZippieRewardTokenERC20 = artifacts.require("ZippieRewardTokenERC20");

contract("ZippieRewardTokenERC20", ([owner, receiver]) => {

  beforeEach(async function () {
    this.rewardToken = await ZippieRewardTokenERC20.new("Reward Token (XYZ)", "REWARD-XYZ", 6, { from: owner });
    this.rewardToken.mint(owner, new BN(1), { from: owner })
  });

  describe('ERC20 Transfers', function() {
    it("allows token holders to transfer tokens", async function () {
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(1));
      (await this.rewardToken.balanceOf(receiver)).should.be.bignumber.equal(new BN(0));
      const { logs } = await this.rewardToken.transfer(receiver, new BN(1), { from: owner });
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: receiver, value: new BN(1) });
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(0));
      (await this.rewardToken.balanceOf(receiver)).should.be.bignumber.equal(new BN(1));
    });
  
    it("reverts if trying to transfer tokens to the zero address", async function () {
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(1));
      await shouldFail.reverting(this.rewardToken.transfer(constants.ZERO_ADDRESS, new BN(1), { from: owner }));
    });
  
    it("reverts if trying to transfer more tokens than current account balance", async function () {
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(1));
      await shouldFail.reverting(this.rewardToken.transfer(receiver, new BN(2), { from: owner }));
    });
  
    it("allows to tranfer tokens from other accounts when first approved", async function() {
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(1));
      (await this.rewardToken.allowance(owner, receiver)).should.be.bignumber.equal(new BN(0));
      const { logs } = await this.rewardToken.approve(receiver, new BN(1), { from: owner });
      expectEvent.inLogs(logs, "Approval", { owner: owner, spender: receiver, value: new BN(1) });
      (await this.rewardToken.allowance(owner, receiver)).should.be.bignumber.equal(new BN(1));
      await this.rewardToken.transferFrom(owner, receiver, new BN(1), { from: receiver });
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(0));
    });
  
    it("reverts if trying to transfers tokens from other accounts when not approved", async function () {
      (await this.rewardToken.allowance(owner, receiver)).should.be.bignumber.equal(new BN(0));
      await shouldFail.reverting(this.rewardToken.transferFrom(owner, receiver, new BN(1), { from: receiver }));
    });    
  })

  describe('ERC20 Mintable (MinterRole)', function() {
    it("allowes minters to mint new tokens", async function() {
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(1));
      (await this.rewardToken.isMinter(owner)).should.be.equal(true);
      const { logs } = await this.rewardToken.mint(owner, new BN(1), { from: owner });
      expectEvent.inLogs(logs, "Transfer", { from: constants.ZERO_ADDRESS, to: owner, value: new BN(1) });
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(2));
    });
  
    it("reverts if non-minter tries to mint new tokens", async function() {
      (await this.rewardToken.isMinter(receiver)).should.be.equal(false);
      await shouldFail.reverting(this.rewardToken.mint(receiver, new BN(1), { from: receiver }));
    });
  
    it("allows minters to add new minters", async function() {
      (await this.rewardToken.isMinter(owner)).should.be.equal(true);
      const { logs } = await this.rewardToken.addMinter(receiver, { from: owner });
      expectEvent.inLogs(logs, "MinterAdded", { account: receiver });
      (await this.rewardToken.isMinter(receiver)).should.be.equal(true);
    });
  
    it("reverts if non-minters tries to add new minters", async function() {
      (await this.rewardToken.isMinter(receiver)).should.be.equal(false);
      await shouldFail.reverting(this.rewardToken.addMinter(receiver, { from: receiver }));
    });
  
    it("allows minters to renounce", async function() {
      (await this.rewardToken.isMinter(owner)).should.be.equal(true);
      const { logs } = await this.rewardToken.renounceMinter( { from: owner} );
      expectEvent.inLogs(logs, "MinterRemoved", { account: owner });
      (await this.rewardToken.isMinter(owner)).should.be.equal(false);
    });
  })

  describe('ERC20 Brunable', function() {
    it("allows token holders to burn tokens", async function() {
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(1));
      const { logs } = await this.rewardToken.burn(new BN(1), { from: owner });
      expectEvent.inLogs(logs, "Transfer", { from: owner, to: constants.ZERO_ADDRESS, value: new BN(1) });
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(0));
    });
  
    it("reverts if trying to burn more tokens than current account balance", async function () {
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(1));
      await shouldFail.reverting(this.rewardToken.burn(new BN(2), { from: owner }));
    });
  
    it("allows to burn tokens from other accounts when first approved", async function() {
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(1));
      (await this.rewardToken.allowance(owner, receiver)).should.be.bignumber.equal(new BN(0));
      const { logs } = await this.rewardToken.approve(receiver, new BN(1), { from: owner });
      expectEvent.inLogs(logs, "Approval", { owner: owner, spender: receiver, value: new BN(1) });
      (await this.rewardToken.allowance(owner, receiver)).should.be.bignumber.equal(new BN(1));
      await this.rewardToken.burnFrom(owner, new BN(1), { from: receiver });
      (await this.rewardToken.balanceOf(owner)).should.be.bignumber.equal(new BN(0));
    });
  
    it("reverts if trying to burn tokens from other accounts when not approved", async function () {
      (await this.rewardToken.allowance(owner, receiver)).should.be.bignumber.equal(new BN(0));
      await shouldFail.reverting(this.rewardToken.burnFrom(owner, new BN(1), { from: receiver }));
    });
  })  

  describe('ERC20 Details and Ownable (Owner)', function() {
    it("sets initial token details (name, symbol and decimals)", async function () {
      (await this.rewardToken.name()).should.be.equal("Reward Token (XYZ)");
      (await this.rewardToken.symbol()).should.be.equal("REWARD-XYZ");
      (await this.rewardToken.decimals()).should.be.bignumber.equal(new BN(6));
    });
  
    it("allows owner to update token name and symbol", async function () {
      (await this.rewardToken.isOwner( { from: owner } )).should.be.equal(true);
      await this.rewardToken.updateERC20Details('Reward Token (EUR)', 'REWARD-EUR', { from: owner });
      (await this.rewardToken.name()).should.be.equal("Reward Token (EUR)");
      (await this.rewardToken.symbol()).should.be.equal("REWARD-EUR");
    });
  
    it("reverts if a non-owner tries to update token name and symbol", async function () {
      (await this.rewardToken.isOwner( { from: receiver } )).should.be.equal(false);
      await shouldFail.reverting(this.rewardToken.updateERC20Details('Reward Token (EUR)', 'REWARD-EUR', { from: receiver }));
    });
  
    it("allows owner to renounce", async function() {
      (await this.rewardToken.isOwner( { from: owner } )).should.be.equal(true);
      const { logs } = await this.rewardToken.renounceOwnership( { from: owner} );
      expectEvent.inLogs(logs, "OwnershipTransferred", { previousOwner: owner, newOwner: constants.ZERO_ADDRESS });
      (await this.rewardToken.isOwner( { from: owner } )).should.be.equal(false);
    });
  
    it("allows owner to transfer ownership", async function() {
      (await this.rewardToken.isOwner( { from: owner } )).should.be.equal(true);
      (await this.rewardToken.isOwner( { from: receiver } )).should.be.equal(false);
      const { logs } = await this.rewardToken.transferOwnership(receiver, { from: owner} );
      expectEvent.inLogs(logs, "OwnershipTransferred", { previousOwner: owner, newOwner: receiver });
      (await this.rewardToken.isOwner( { from: owner } )).should.be.equal(false);
      (await this.rewardToken.isOwner( { from: receiver } )).should.be.equal(true);
    });
  })

  describe('ERC20 Pausable (PauserRole)', function() {
    it("allows pausers to pause token", async function () {
      (await this.rewardToken.isPauser(owner)).should.be.equal(true);
      const { logs } = await this.rewardToken.pause({ from: owner });
      expectEvent.inLogs(logs, "Paused", { account: owner });
    });
   
    it("reverts if non-pausers tries to pause token", async function () {
      (await this.rewardToken.isPauser(receiver)).should.be.equal(false);
      await shouldFail.reverting(this.rewardToken.pause({ from: receiver }));
    });
  
    it("allows pausers to unpause token", async function () {
      (await this.rewardToken.isPauser(owner)).should.be.equal(true);
      await this.rewardToken.pause({ from: owner });
      const { logs } = await this.rewardToken.unpause({ from: owner });
      expectEvent.inLogs(logs, "Unpaused", { account: owner });
    });
  
    it("reverts if non-pausers tries to unpause token", async function () {
      (await this.rewardToken.isPauser(receiver)).should.be.equal(false);
      await shouldFail.reverting(this.rewardToken.unpause({ from: receiver }));
    });
  
    it("allows transfer of tokens when not paused", async function () {
      (await this.rewardToken.paused()).should.be.equal(false);
      await this.rewardToken.transfer(receiver, new BN(1), { from: owner });
    });
  
    it("reverts if trying to transfer tokens when paused", async function () {
      await this.rewardToken.pause({ from: owner });
      (await this.rewardToken.paused()).should.be.equal(true);
      await shouldFail.reverting(this.rewardToken.transfer(receiver, new BN(1), { from: owner }));
    });
  
    it("allows pausers to add new pausers", async function() {
      (await this.rewardToken.isPauser(owner)).should.be.equal(true);
      const { logs } = await this.rewardToken.addPauser(receiver, { from: owner });
      expectEvent.inLogs(logs, "PauserAdded", { account: receiver });
      (await this.rewardToken.isPauser(receiver)).should.be.equal(true);
    });
  
    it("reverts if non-pausers tries to add new pausers", async function() {
      (await this.rewardToken.isPauser(receiver)).should.be.equal(false);
      await shouldFail.reverting(this.rewardToken.addPauser(receiver, { from: receiver }));
    });
  
    it("allows pausers to renounce", async function() {
      (await this.rewardToken.isPauser(owner)).should.be.equal(true);
      const { logs } = await this.rewardToken.renouncePauser( { from: owner} );
      expectEvent.inLogs(logs, "PauserRemoved", { account: owner });
      (await this.rewardToken.isPauser(owner)).should.be.equal(false);
    });
  })
});