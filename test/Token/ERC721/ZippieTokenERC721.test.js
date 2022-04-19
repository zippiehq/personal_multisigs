const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { expect } = require('chai');
const ZippieTokenERC721 = artifacts.require("ZippieTokenERC721");

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = web3.utils.keccak256("MINTER_ROLE")
const PAUSER_ROLE = web3.utils.keccak256("PAUSER_ROLE")
const APPROVER_ROLE = web3.utils.keccak256("APPROVER_ROLE")

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract("ZippieTokenERC721", ([admin, operator, sender, receiver, other]) => {

  beforeEach(async function () {
    this.token = await ZippieTokenERC721.new(admin, operator, "Zippie-ERC721", "ZIPPIE-ERC721", "baseURI", { from: admin });
    this.token.mint(sender, "1", "tokenURI", { from: admin })
  });
  
  describe('AdminRole', function() {
    it("owner and operator has the admin role", async function () {
      expect(await this.token.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.bignumber.equal('2')
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, operator)).to.equal(true)
    })
    it("allows admin to add new admins", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      const receipt = await this.token.grantRole(DEFAULT_ADMIN_ROLE, other, { from: admin })
      expectEvent(receipt, 'RoleGranted', { account: other, role: DEFAULT_ADMIN_ROLE, sender: admin })
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
    })

    it("reverts if a non-admin tries to add new admins", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expectRevert.unspecified(this.token.grantRole(DEFAULT_ADMIN_ROLE, other, { from: other }))
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
    })

    it("allows admin to revoke admins", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      const receipt2 = await this.token.revokeRole(DEFAULT_ADMIN_ROLE, admin, { from: admin })
      expectEvent(receipt2, 'RoleRevoked', { account: admin, role: DEFAULT_ADMIN_ROLE, sender: admin })
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(false)
    })

    it("reverts is a non-admin tries to revoke admins", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      await expectRevert.unspecified(this.token.revokeRole(DEFAULT_ADMIN_ROLE, admin, { from: other }))
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
    })

    it("allows admin to renounce", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await this.token.grantRole(DEFAULT_ADMIN_ROLE, other, { from: admin })
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
      const receipt = await this.token.renounceRole(DEFAULT_ADMIN_ROLE, other, { from: other })
      expectEvent(receipt, 'RoleRevoked', { account: other, role: DEFAULT_ADMIN_ROLE, sender: other })
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
    })

    it("reverts if someone else tries to renounce admin", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await this.token.grantRole(DEFAULT_ADMIN_ROLE, other, { from: admin })
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
      await expectRevert.unspecified(this.token.renounceRole(DEFAULT_ADMIN_ROLE, other, { from: admin }))
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
    })
  })

  describe('MinterRole', function() {
    it("owner and operator has the minter role", async function () {
      expect(await this.token.getRoleMemberCount(MINTER_ROLE)).to.bignumber.equal('2')
      expect(await this.token.hasRole(MINTER_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, operator)).to.equal(true)
    })
    
    it("allows admin to add minters", async function () {
      expect(await this.token.getRoleAdmin(MINTER_ROLE)).to.equal(DEFAULT_ADMIN_ROLE)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(false)
      const receipt = await this.token.grantRole(MINTER_ROLE, other, { from: admin })
      expectEvent(receipt, 'RoleGranted', { account: other, role: MINTER_ROLE, sender: admin })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
    })

    it("reverts if a non-admin tries to add minters", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expectRevert.unspecified(this.token.grantRole(MINTER_ROLE, other, { from: other }))
    })

    it("reverts is a minter tries to add minters", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await this.token.grantRole(MINTER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
      await expectRevert.unspecified(this.token.grantRole(MINTER_ROLE, other, { from: other }))
    })

    it("allows admin to revoke minters", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, admin)).to.equal(true)
      const receipt = await this.token.revokeRole(MINTER_ROLE, admin, { from: admin })
      expectEvent(receipt, 'RoleRevoked', { account: admin, role: MINTER_ROLE, sender: admin })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(false)
    })

    it("reverts if a non-admin tries to revoke minters", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expectRevert.unspecified(this.token.revokeRole(MINTER_ROLE, admin, { from: other }))
    })

    it("reverts is a minter tries to revoke minters", async function () {
      await this.token.grantRole(MINTER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expectRevert.unspecified(this.token.revokeRole(MINTER_ROLE, other, { from: other }))
    })

    it("allows minter to renounce", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(false)
      await this.token.grantRole(MINTER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      const receipt = await this.token.renounceRole(MINTER_ROLE, other, { from: other })
      expectEvent(receipt, 'RoleRevoked', { account: other, role: MINTER_ROLE, sender: other })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(false)
    })

    it("reverts if someone else tries to renounce minter", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(false)
      await this.token.grantRole(MINTER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expectRevert.unspecified(this.token.renounceRole(MINTER_ROLE, other, { from: admin }))
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.equal(true)
    })
  })

  describe('PauserRole', function() {
    it("owner and operator has the pauser role", async function () {
      expect(await this.token.getRoleMemberCount(PAUSER_ROLE)).to.bignumber.equal('2')
      expect(await this.token.hasRole(PAUSER_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, operator)).to.equal(true)
    })
    
    it("allows admin to add pausers", async function () {
      expect(await this.token.getRoleAdmin(PAUSER_ROLE)).to.equal(DEFAULT_ADMIN_ROLE)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(false)
      const receipt2 = await this.token.grantRole(PAUSER_ROLE, other, { from: admin })
      expectEvent(receipt2, 'RoleGranted', { account: other, role: PAUSER_ROLE, sender: admin })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
    })

    it("reverts is a non-admin tries to add pausers", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expectRevert.unspecified(this.token.grantRole(PAUSER_ROLE, other, { from: other }))
    })

    it("reverts is a pauser tries to add pausers", async function () {
      await this.token.grantRole(PAUSER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expectRevert.unspecified(this.token.grantRole(PAUSER_ROLE, other, { from: other }))
    })

    it("allows admin to revoke pausers", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(PAUSER_ROLE, admin)).to.equal(true)
      const receipt2 = await this.token.revokeRole(PAUSER_ROLE, admin, { from: admin })
      expectEvent(receipt2, 'RoleRevoked', { account: admin, role: PAUSER_ROLE, sender: admin })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(false)
    })

    it("reverts is a non-admin tries to revoke pausers", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expectRevert.unspecified(this.token.revokeRole(PAUSER_ROLE, other, { from: other }))
    })

    it("reverts is a pauser tries to revoke pausers", async function () {
      await this.token.grantRole(PAUSER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expectRevert.unspecified(this.token.revokeRole(PAUSER_ROLE, other, { from: other }))
    })

    it("allows pauser to renounce", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(false)
      await this.token.grantRole(PAUSER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      const receipt = await this.token.renounceRole(PAUSER_ROLE, other, { from: other })
      expectEvent(receipt, 'RoleRevoked', { account: other, role: PAUSER_ROLE, sender: other })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(false)
    })

    it("reverts if someone else tries to renounce pauser", async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(false)
      await this.token.grantRole(PAUSER_ROLE, other, { from: admin })
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
      await expectRevert.unspecified(this.token.renounceRole(PAUSER_ROLE, other, { from: admin }))
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.equal(true)
    })
  })

  describe('Mint', function() {
    it("allows minters to mint new tokens", async function() {
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.hasRole(MINTER_ROLE, admin)).to.be.equal(true);
      const { logs } = await this.token.mint(sender, "2", "/tokenURI", { from: admin });
      expectEvent.inLogs(logs, "Transfer", { from: constants.ZERO_ADDRESS, to: sender, tokenId: "2" });
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(2));
      expect(await this.token.tokenURI("2")).to.be.equal("baseURI/tokenURI");
    });
  
    it("reverts if non-minter tries to mint new tokens", async function() {
      expect(await this.token.hasRole(MINTER_ROLE, other)).to.be.equal(false);
      await expectRevert(this.token.mint(sender, "2", "tokenURI", { from: other }), 'ZippieTokenERC721: must have minter role to mint');
    });
  })

  describe('Transfers', function() {
    it("allows approver approve transfers", async function () {
      expect(await this.token.ownerOf("1")).to.be.equal(sender);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(0));
      const receipt1 = await this.token.transferFrom(sender, receiver, "1", { from: sender });
      expectEvent(receipt1, "Transfer", { from: sender, to: this.token.address, tokenId: "1" });
      expectEvent(receipt1, "NewTransfer", { from: sender, to: receiver, tokenId: "1" });
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(1));

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true);
      const receipt2 = await this.token.approveTransferFrom(sender, receiver, "1", '0x01', { from: admin });
      expectEvent(receipt2, "Transfer", { from: this.token.address, to: receiver, tokenId: "1" });
      expectEvent(receipt2, "ApprovedTransfer", { from: sender, to: receiver, tokenId: "1", by: admin, metadata: '0x01' });
      expect(await this.token.ownerOf("1")).to.be.equal(receiver);
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(1));
    });

    it("allows approver to reject transfers", async function () {
      expect(await this.token.ownerOf("1")).to.be.equal(sender);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(0));
      const receipt1 = await this.token.transferFrom(sender, receiver, "1", { from: sender });
      expectEvent(receipt1, "Transfer", { from: sender, to: this.token.address, tokenId: "1" });
      expectEvent(receipt1, "NewTransfer", { from: sender, to: receiver, tokenId: "1" });
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(1));

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true);
      const receipt2 = await this.token.rejectTransferFrom(sender, receiver, "1", '0x01', { from: admin });
      expectEvent(receipt2, "Transfer", { from: this.token.address, to: sender, tokenId: "1" });
      expectEvent(receipt2, "RejectedTransfer", { from: sender, to: receiver, tokenId: "1", by: admin, metadata: '0x01' });
      expect(await this.token.ownerOf("1")).to.be.equal(sender);
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
    });

    it("reverts if approver is trying to send tokens to a different address when approving", async function () {
      expect(await this.token.exists("1")).to.be.equal(true);
      expect(await this.token.ownerOf("1")).to.be.equal(sender);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(0));
      const receipt1 = await this.token.transferFrom(sender, receiver, "1", { from: sender });
      expectEvent(receipt1, "Transfer", { from: sender, to: this.token.address, tokenId: "1" });
      expectEvent(receipt1, "NewTransfer", { from: sender, to: receiver, tokenId: "1" });
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(1));

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true);
      await expectRevert(this.token.approveTransferFrom(sender, other, "1", '0x01', { from: admin }), 'ZippieTokenERC721: invalid address');
      expect(await this.token.exists("1")).to.be.equal(true);
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address);
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(1));
    });

    it("reverts if approver is trying to send tokens to a different address when rejecting", async function () {
      expect(await this.token.exists("1")).to.be.equal(true);
      expect(await this.token.ownerOf("1")).to.be.equal(sender);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(0));
      const receipt1 = await this.token.transferFrom(sender, receiver, "1", { from: sender });
      expectEvent(receipt1, "Transfer", { from: sender, to: this.token.address, tokenId: "1" });
      expectEvent(receipt1, "NewTransfer", { from: sender, to: receiver, tokenId: "1" });
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(1));

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true);
      await expectRevert(this.token.rejectTransferFrom(other, receiver, "1", '0x01', { from: admin }), 'ZippieTokenERC721: invalid address');
      expect(await this.token.exists("1")).to.be.equal(true);
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address);
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(1));
    });

    it("reverts if approver is trying to transfer tokens in transit", async function () {
      expect(await this.token.exists("1")).to.be.equal(true);
      expect(await this.token.exists("2")).to.be.equal(false);
      expect(await this.token.ownerOf("1")).to.be.equal(sender);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(0));
      const receipt1 = await this.token.transferFrom(sender, receiver, "1", { from: sender });
      expectEvent(receipt1, "Transfer", { from: sender, to: this.token.address, tokenId: "1" });
      expectEvent(receipt1, "NewTransfer", { from: sender, to: receiver, tokenId: "1" });
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(1));

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true);
      await expectRevert(this.token.transferFrom(this.token.address, other, "1", { from: admin }), 'ZippieTokenERC721: transfer caller is not owner nor approved');
      expect(await this.token.exists("1")).to.be.equal(true);
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address);
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(1));
    });
  
    it("reverts if approver is trying to burn tokens in transit", async function () {
      expect(await this.token.exists("1")).to.be.equal(true);
      expect(await this.token.exists("2")).to.be.equal(false);
      expect(await this.token.ownerOf("1")).to.be.equal(sender);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(new BN(0));
      const receipt1 = await this.token.transferFrom(sender, receiver, "1", { from: sender });
      expectEvent(receipt1, "Transfer", { from: sender, to: this.token.address, tokenId: "1" });
      expectEvent(receipt1, "NewTransfer", { from: sender, to: receiver, tokenId: "1" });
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address);
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(1));

      expect(await this.token.hasRole(APPROVER_ROLE, admin)).to.be.equal(true);
      await expectRevert(this.token.burn("1", { from: admin }), 'ERC721Burnable: caller is not owner nor approved');
      expect(await this.token.exists("1")).to.be.equal(true);
      expect(await this.token.ownerOf("1")).to.be.equal(this.token.address);
      expect(await this.token.balanceOf(this.token.address)).to.be.bignumber.equal(new BN(1));
    });
  
    it("reverts if trying to transfer tokens to the zero address", async function () {
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      await expectRevert.unspecified(this.token.transferFrom(sender, constants.ZERO_ADDRESS, "1", { from: sender }));
    });
  
    it("reverts if trying to transfer tokens and not owner or approved", async function () {
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.ownerOf("1")).to.not.be.equal(other);
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS);
      expect(await this.token.isApprovedForAll(sender, other)).to.be.equal(false);
      await expectRevert.unspecified(this.token.transferFrom(sender, receiver, "1", { from: other }));
    });
  
    it("allows to transfer a specific tokens from other accounts when first approved", async function() {
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS);
      const { logs } = await this.token.approve(other, "1", { from: sender });
      expectEvent.inLogs(logs, "Approval", { owner: sender, approved: other, tokenId: "1" });
      expect(await this.token.getApproved("1")).to.be.equal(other);
      await this.token.transferFrom(sender, receiver, "1", { from: other });
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
    });

    it("allows to transfer all tokens from other accounts when first approved for all", async function() {
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS);
      expect(await this.token.isApprovedForAll(sender, other)).to.be.equal(false);
      const { logs } = await this.token.setApprovalForAll(other, true, { from: sender });
      expectEvent.inLogs(logs, "ApprovalForAll", { owner: sender, operator: other, approved: true });
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS);
      expect(await this.token.isApprovedForAll(sender, other)).to.be.equal(true);
      await this.token.transferFrom(sender, receiver, "1", { from: other });
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
    });
  
    it("reverts if trying to transfers tokens from other accounts when not approved", async function () {
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS);
      await expectRevert.unspecified(this.token.transferFrom(sender, receiver, "1", { from: other }));
    });    
  })

  describe('Burn', function() {
    it("allows token holders to burn tokens", async function() {
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      const { logs } = await this.token.burn("1", { from: sender });
      expectEvent.inLogs(logs, "Transfer", { from: sender, to: constants.ZERO_ADDRESS, tokenId: "1" });
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
    });
  
    it("reverts if trying to burn more tokens than current account balance", async function () {
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      await expectRevert.unspecified(this.token.burn(new BN(2), { from: sender }));
    });
  
    it("allows to burn a specific token from other accounts when first approved", async function() {
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS);
      const { logs } = await this.token.approve(other, "1", { from: sender });
      expectEvent.inLogs(logs, "Approval", { owner: sender, approved: other, tokenId: "1" });
      expect(await this.token.getApproved("1")).to.be.equal(other);
      await this.token.burn("1", { from: other });
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
    });

    it("allows to burn all tokens from other accounts when first approved for all", async function() {
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(1));
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS);
      expect(await this.token.isApprovedForAll(sender, other)).to.be.equal(false);
      const { logs } = await this.token.setApprovalForAll(other, true, { from: sender });
      expectEvent.inLogs(logs, "ApprovalForAll", { owner: sender, operator: other, approved: true });
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS);
      expect(await this.token.isApprovedForAll(sender, other)).to.be.equal(true);

      await this.token.burn("1", { from: other });
      expect(await this.token.balanceOf(sender)).to.be.bignumber.equal(new BN(0));
    });
  
    it("reverts if trying to burn tokens from other accounts when not approved", async function () {
      expect(await this.token.getApproved("1")).to.be.equal(ZERO_ADDRESS);
      await expectRevert.unspecified(this.token.burn("1", { from: other }));
    });
  })  

  describe('Pause', function() {
    it("allows pausers to pause token", async function () {
      expect(await this.token.hasRole(PAUSER_ROLE, admin)).to.be.equal(true);
      const { logs } = await this.token.pause({ from: admin });
      expectEvent.inLogs(logs, "Paused", { account: admin });
    });
   
    it("reverts if non-pausers tries to pause token", async function () {
      expect(await this.token.hasRole(PAUSER_ROLE, other)).to.be.equal(false);
      await expectRevert(this.token.pause({ from: other }), 'ZippieTokenERC721: must have pauser role to pause');
    });
  
    it("allows pausers to unpause token", async function () {
      await this.token.pause({ from: admin });
      const { logs } = await this.token.unpause({ from: admin });
      expectEvent.inLogs(logs, "Unpaused", { account: admin });
    });
  
    it("reverts if non-pausers tries to unpause token", async function () {
      await expectRevert(this.token.unpause({ from: other }), 'ZippieTokenERC721: must have pauser role to unpause');
    });
  
    it("allows transfer of tokens when not paused", async function () {
      expect(await this.token.paused()).to.be.equal(false);
      await this.token.transferFrom(sender, receiver, "1", { from: sender });
    });
  
    it("reverts if trying to transfer tokens when paused", async function () {
      await this.token.pause({ from: admin });
      expect(await this.token.paused()).to.be.equal(true);
      await expectRevert.unspecified(this.token.transferFrom(sender, receiver, "1", { from: admin }));
    });
  })
});

