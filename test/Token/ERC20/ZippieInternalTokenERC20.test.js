const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { expect } = require('chai');
const ZippieInternalTokenERC20 = artifacts.require("ZippieInternalTokenERC20");

contract("ZippieInternalTokenERC20", ([owner, sender, receiver, other]) => {

  beforeEach(async function () {
    this.token = await ZippieInternalTokenERC20.new("Token (XYZ)", "TOKEN-XYZ", 6, { from: owner });
    this.token.mint(sender, new BN(1), { from: owner })
  });

  describe('ERC20 Whitelisted Transfer (WhitelistAdminRole)', function() {
    it("allows transfer between whitelisted accounts", async function () {
      await this.token.addWhitelisted(sender, { from: owner });
      await this.token.addWhitelisted(receiver, { from: owner });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(true);
      expect(await this.token.isWhitelisted(receiver)).to.be.equal(true);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(0));
      const { logs } = await this.token.transfer(receiver, new BN(1), { from: sender });
      expectEvent.inLogs(logs, "Transfer", { from: sender, to: receiver, value: new BN(1) });
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(1));
    });
   
    it("reverts transfer if token is transfered to a non-whitelisted account", async function () {
      await this.token.addWhitelisted(sender, { from: owner });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(true);
      expect(await this.token.isWhitelisted(receiver)).to.be.equal(false);
      await expectRevert(this.token.transfer(receiver, new BN(1), { from: sender }), 'to address not whitelisted');
    });

    it("reverts transfer if token is transfered from a non-whitelisted account", async function () {
      await this.token.addWhitelisted(receiver, { from: owner });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(false);
      expect(await this.token.isWhitelisted(receiver)).to.be.equal(true);
      await expectRevert(this.token.transfer(receiver, new BN(1), { from: sender }), 'WhitelistedRole: caller does not have the Whitelisted role');
    });

    it("allows transferFrom between whitelisted accounts", async function() {
      expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(0));
      await this.token.approve(other, new BN(1), { from: sender });
      expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(1));
      await this.token.addWhitelisted(sender, { from: owner });
      await this.token.addWhitelisted(receiver, { from: owner });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(true);
      expect(await this.token.isWhitelisted(receiver)).to.be.equal(true);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(0));
      const { logs } = await this.token.transferFrom(sender, receiver, new BN(1), { from: other });
      expectEvent.inLogs(logs, "Transfer", { from: sender, to: receiver, value: new BN(1) });
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(1));
    });

    it("reverts transferFrom if token is transfered to a non-whitelisted account", async function() {
      expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(0));
      await this.token.approve(other, new BN(1), { from: sender });
      expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(1));
      await this.token.addWhitelisted(sender, { from: owner });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(true);
      expect(await this.token.isWhitelisted(receiver)).to.be.equal(false);
      await expectRevert(this.token.transferFrom(sender, receiver, new BN(1), { from: other }), 'to address not whitelisted');
    });

    it("reverts transferFrom if token is transfered from a non-whitelisted account", async function() {
      expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(0));
      await this.token.approve(other, new BN(1), { from: sender });
      expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(1));
      await this.token.addWhitelisted(receiver, { from: owner });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(false);
      expect(await this.token.isWhitelisted(receiver)).to.be.equal(true);
      await expectRevert(this.token.transferFrom(sender, receiver, new BN(1), { from: other }), 'from address not whitelisted');
    });

    it("allows whitelisted accounts to renounce", async function() {
      await this.token.addWhitelisted(sender, { from: owner });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(true);
      await this.token.renounceWhitelisted({ from: sender });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(false);
    });

    it("allows whitelistAdmins to add whitelisted accounts", async function () {
      expect(await this.token.isWhitelistAdmin(owner)).to.be.equal(true);
      expect(await this.token.isWhitelisted(sender)).to.be.equal(false);
      const { logs } = await this.token.addWhitelisted(sender, { from: owner });
      expectEvent.inLogs(logs, "WhitelistedAdded", { account: sender });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(true);
    });

    it("reverts id a non-whitelistAdmins tries to add whitelisted accounts", async function () {
      expect(await this.token.isWhitelistAdmin(other)).to.be.equal(false);
      expect(await this.token.isWhitelisted(sender)).to.be.equal(false);
      await expectRevert(this.token.addWhitelisted(sender, { from: other }), 'WhitelistAdminRole: caller does not have the WhitelistAdmin role');
    });

    it("allows whitelistAdmins to remove whitelisted accounts", async function () {
      expect(await this.token.isWhitelistAdmin(owner)).to.be.equal(true);
      await this.token.addWhitelisted(sender, { from: owner });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(true);
      const { logs } = await this.token.removeWhitelisted(sender, { from: owner });
      expectEvent.inLogs(logs, "WhitelistedRemoved", { account: sender });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(false);
    });

    it("reverts id a non-whitelistAdmins tries to remove whitelisted accounts", async function () {
      expect(await this.token.isWhitelistAdmin(owner)).to.be.equal(true);
      await this.token.addWhitelisted(sender, { from: owner });
      expect(await this.token.isWhitelisted(sender)).to.be.equal(true);
      expect(await this.token.isWhitelistAdmin(other)).to.be.equal(false);
      await expectRevert(this.token.removeWhitelisted(sender, { from: other }), 'WhitelistAdminRole: caller does not have the WhitelistAdmin role');
    });

    it("allows whitelistAdmins to add new whitelistAdmins", async function() {
      expect(await this.token.isWhitelistAdmin(owner)).to.be.equal(true);
      expect(await this.token.isWhitelistAdmin(other)).to.be.equal(false);
      const { logs } = await this.token.addWhitelistAdmin(other, { from: owner });
      expectEvent.inLogs(logs, "WhitelistAdminAdded", { account: other });
      expect(await this.token.isWhitelistAdmin(other)).to.be.equal(true);
    });

    it("reverts if non-whitelistAdmins tries to add new whitelistAdmins", async function() {
      expect(await this.token.isWhitelistAdmin(other)).to.be.equal(false);
      expectRevert(this.token.addWhitelistAdmin(other, { from: other }), 'WhitelistAdminRole: caller does not have the WhitelistAdmin role');
    });

    it("allows whitelistAdmins to renounce", async function() {
      expect(await this.token.isWhitelistAdmin(owner)).to.be.equal(true);
      await this.token.renounceWhitelistAdmin({ from: owner });
      expect(await this.token.isWhitelisted(owner)).to.be.equal(false);
    });
    
    describe('ERC20 Other functionality', function() {
      beforeEach(async function () {
        this.token.addWhitelisted(sender)
        this.token.addWhitelisted(receiver)
      });
      
      describe('ERC20 Transfers', function() {
        it("allows token holders to transfer tokens", async function () {
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
          expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(0));
          const { logs } = await this.token.transfer(receiver, new BN(1), { from: sender });
          expectEvent.inLogs(logs, "Transfer", { from: sender, to: receiver, value: new BN(1) });
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
          expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(1));
        });
      
        it("reverts if trying to transfer tokens to the zero address", async function () {
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
          await expectRevert.unspecified(this.token.transfer(constants.ZERO_ADDRESS, new BN(1), { from: sender }));
        });
      
        it("reverts if trying to transfer more tokens than current account balance", async function () {
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
          await expectRevert.unspecified(this.token.transfer(receiver, new BN(2), { from: sender }));
        });
      
        it("allows to tranfer tokens from other accounts when first approved", async function() {
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
          expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(0));
          const { logs } = await this.token.approve(other, new BN(1), { from: sender });
          expectEvent.inLogs(logs, "Approval", { owner: sender, spender: other, value: new BN(1) });
          expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(1));
          await this.token.transferFrom(sender, receiver, new BN(1), { from: other });
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
        });
      
        it("reverts if trying to transfers tokens from other accounts when not approved", async function () {
          expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(0));
          await expectRevert.unspecified(this.token.transferFrom(sender, receiver, new BN(1), { from: other }));
        });    
      })
    
      describe('ERC20 Mintable (MinterRole)', function() {
        it("allowes minters to mint new tokens", async function() {
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
          expect(await this.token.isMinter(owner)).to.be.equal(true);
          const { logs } = await this.token.mint(sender, new BN(1), { from: owner });
          expectEvent.inLogs(logs, "Transfer", { from: constants.ZERO_ADDRESS, to: sender, value: new BN(1) });
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(2));
        });
      
        it("reverts if non-minter tries to mint new tokens", async function() {
          expect(await this.token.isMinter(other)).to.be.equal(false);
          await expectRevert.unspecified(this.token.mint(sender, new BN(1), { from: other }));
        });
      
        it("allows minters to add new minters", async function() {
          expect(await this.token.isMinter(owner)).to.be.equal(true);
          const { logs } = await this.token.addMinter(other, { from: owner });
          expectEvent.inLogs(logs, "MinterAdded", { account: other });
          expect(await this.token.isMinter(other)).to.be.equal(true);
        });
      
        it("reverts if non-minters tries to add new minters", async function() {
          expect(await this.token.isMinter(other)).to.be.equal(false);
          await expectRevert.unspecified(this.token.addMinter(sender, { from: other }));
        });
      
        it("allows minters to renounce", async function() {
          expect(await this.token.isMinter(owner)).to.be.equal(true);
          const { logs } = await this.token.renounceMinter( { from: owner} );
          expectEvent.inLogs(logs, "MinterRemoved", { account: owner });
          expect(await this.token.isMinter(owner)).to.be.equal(false);
        });
      })
    
      describe('ERC20 Brunable', function() {
        it("allows token holders to burn tokens", async function() {
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
          const { logs } = await this.token.burn(new BN(1), { from: sender });
          expectEvent.inLogs(logs, "Transfer", { from: sender, to: constants.ZERO_ADDRESS, value: new BN(1) });
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
        });
      
        it("reverts if trying to burn more tokens than current account balance", async function () {
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
          await expectRevert.unspecified(this.token.burn(new BN(2), { from: sender }));
        });
      
        it("allows to burn tokens from other accounts when first approved", async function() {
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
          expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(0));
          const { logs } = await this.token.approve(other, new BN(1), { from: sender });
          expectEvent.inLogs(logs, "Approval", { owner: sender, spender: other, value: new BN(1) });
          expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(1));
          await this.token.burnFrom(sender, new BN(1), { from: other });
          expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
        });
      
        it("reverts if trying to burn tokens from other accounts when not approved", async function () {
          expect(await this.token.allowance(sender, other)).to.be.bignumber.equal(new BN(0));
          await expectRevert.unspecified(this.token.burnFrom(sender, new BN(1), { from: other }));
        });
      })  
    
      describe('ERC20 Detailed Mutable and Ownable (Owner)', function() {
        it("sets initial token details (name, symbol and decimals)", async function () {
          expect(await this.token.name()).to.be.equal("Token (XYZ)");
          expect(await this.token.symbol()).to.be.equal("TOKEN-XYZ");
          expect(await this.token.decimals()).to.be.bignumber.equal(new BN(6));
        });
      
        it("allows owner to update token name and symbol", async function () {
          expect(await this.token.isOwner( { from: owner } )).to.be.equal(true);
          await this.token.updateERC20Details('Token (EUR)', 'TOKEN-EUR', { from: owner });
          expect(await this.token.name()).to.be.equal("Token (EUR)");
          expect(await this.token.symbol()).to.be.equal("TOKEN-EUR");
        });
      
        it("reverts if a non-owner tries to update token name and symbol", async function () {
          expect(await this.token.isOwner( { from: other } )).to.be.equal(false);
          await expectRevert.unspecified(this.token.updateERC20Details('Token (EUR)', 'TOKEN-EUR', { from: other }));
        });
      
        it("allows owner to renounce", async function() {
          expect(await this.token.isOwner( { from: owner } )).to.be.equal(true);
          const { logs } = await this.token.renounceOwnership( { from: owner} );
          expectEvent.inLogs(logs, "OwnershipTransferred", { previousOwner: owner, newOwner: constants.ZERO_ADDRESS });
          expect(await this.token.isOwner( { from: owner } )).to.be.equal(false);
        });
      
        it("allows owner to transfer ownership", async function() {
          expect(await this.token.isOwner( { from: owner } )).to.be.equal(true);
          expect(await this.token.isOwner( { from: other } )).to.be.equal(false);
          const { logs } = await this.token.transferOwnership(other, { from: owner} );
          expectEvent.inLogs(logs, "OwnershipTransferred", { previousOwner: owner, newOwner: other });
          expect(await this.token.isOwner( { from: owner } )).to.be.equal(false);
          expect(await this.token.isOwner( { from: other } )).to.be.equal(true);
        });
      })
    
      describe('ERC20 Pausable (PauserRole)', function() {
        it("allows pausers to pause token", async function () {
          expect(await this.token.isPauser(owner)).to.be.equal(true);
          const { logs } = await this.token.pause({ from: owner });
          expectEvent.inLogs(logs, "Paused", { account: owner });
        });
      
        it("reverts if non-pausers tries to pause token", async function () {
          expect(await this.token.isPauser(other)).to.be.equal(false);
          await expectRevert.unspecified(this.token.pause({ from: other }));
        });
      
        it("allows pausers to unpause token", async function () {
          expect(await this.token.isPauser(owner)).to.be.equal(true);
          await this.token.pause({ from: owner });
          const { logs } = await this.token.unpause({ from: owner });
          expectEvent.inLogs(logs, "Unpaused", { account: owner });
        });
      
        it("reverts if non-pausers tries to unpause token", async function () {
          expect(await this.token.isPauser(other)).to.be.equal(false);
          await expectRevert.unspecified(this.token.unpause({ from: other }));
        });
      
        it("allows transfer of tokens when not paused", async function () {
          expect(await this.token.paused()).to.be.equal(false);
          await this.token.transfer(receiver, new BN(1), { from: sender });
        });
      
        it("reverts if trying to transfer tokens when paused", async function () {
          await this.token.pause({ from: owner });
          expect(await this.token.paused()).to.be.equal(true);
          await expectRevert.unspecified(this.token.transfer(receiver, new BN(1), { from: owner }));
        });
      
        it("allows pausers to add new pausers", async function() {
          expect(await this.token.isPauser(owner)).to.be.equal(true);
          const { logs } = await this.token.addPauser(other, { from: owner });
          expectEvent.inLogs(logs, "PauserAdded", { account: other });
          expect(await this.token.isPauser(other)).to.be.equal(true);
        });
      
        it("reverts if non-pausers tries to add new pausers", async function() {
          expect(await this.token.isPauser(other)).to.be.equal(false);
          await expectRevert.unspecified(this.token.addPauser(receiver, { from: other }));
        });
      
        it("allows pausers to renounce", async function() {
          expect(await this.token.isPauser(owner)).to.be.equal(true);
          const { logs } = await this.token.renouncePauser( { from: owner} );
          expectEvent.inLogs(logs, "PauserRemoved", { account: owner });
          expect(await this.token.isPauser(owner)).to.be.equal(false);
        });
      })
    })
  })
});