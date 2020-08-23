const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { expect } = require('chai');
const ZippieTokenFactoryERC721 = artifacts.require("ZippieTokenFactoryERC721");
const ZippieTokenERC721 = artifacts.require("ZippieTokenERC721");

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = web3.utils.keccak256("MINTER_ROLE")
const PAUSER_ROLE = web3.utils.keccak256("PAUSER_ROLE")

contract("ZippieTokenFactoryERC721", ([creator, admin, operator]) => {

  beforeEach(async function () {
    this.zippieTokenFactoryERC721 = await ZippieTokenFactoryERC721.new({ from: admin })
  })

  describe('Deploying new Zippie Token ERC721', function() {
    beforeEach(async function () {
      const { logs, receipt } = await this.zippieTokenFactoryERC721.deployToken(
        admin, 
        operator,
        "Zippie-ERC721",
        "ZIPPIE-ERC721",
        "URI",
        { from: creator }
      )

      this.deployLogs = logs
      this.deployReceipt = receipt
      this.token = await ZippieTokenERC721.at(this.deployLogs[0].args.addr)
    });

    it("emits event with deploy details", async function () {
      expectEvent.inLogs(this.deployLogs, "TokenDeployedERC721", { addr: this.deployLogs[0].args.addr, creator: creator, admin: admin, name: "Zippie-ERC721", symbol: "ZIPPIE-ERC721", baseURI: "URI" });
    });

    it("creates a token with correct details", async function () {
      expect(await this.token.name()).to.be.equal("Zippie-ERC721");
      expect(await this.token.symbol()).to.be.equal("ZIPPIE-ERC721");
      expect(await this.token.baseURI()).to.be.equal("URI");
    });

    it("sets correct admin", async function () {
      expect(await this.token.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.bignumber.be.equal('2');
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.be.equal(true);
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, operator)).to.be.equal(true);
    });

    it("sets correct minter", async function () {
      expect(await this.token.getRoleMemberCount(MINTER_ROLE)).to.bignumber.be.equal('2');
      expect(await this.token.hasRole(MINTER_ROLE, admin)).to.be.equal(true);
      expect(await this.token.hasRole(MINTER_ROLE, operator)).to.be.equal(true);
    });

    it("sets correct pauser", async function () {
      expect(await this.token.getRoleMemberCount(PAUSER_ROLE)).to.bignumber.be.equal('2');
      expect(await this.token.hasRole(PAUSER_ROLE, admin)).to.be.equal(true);
      expect(await this.token.hasRole(PAUSER_ROLE, operator)).to.be.equal(true);
    });

    it("does not mint any tokens when deployed", async function () {
      expect(await this.token.totalSupply()).to.bignumber.be.equal('0');
    });

    it("uses gas", async function () {
      console.log(`Gas used for deploy: ${this.deployReceipt.gasUsed}`)	
    });
  })
})
