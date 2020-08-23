const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { expect } = require('chai');
const { abi:tokenAbi, bytecode:tokenBytecode } = require('../../../build/contracts/ZippieTokenERC721.json')
const ZippieTokenFactoryERC721 = artifacts.require("ZippieTokenFactoryERC721");

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
      this.token = new web3.eth.Contract(tokenAbi, this.deployLogs[0].args.addr)
    });

    it("emits event with deploy details", async function () {
      expectEvent.inLogs(this.deployLogs, "TokenDeployedERC721", { addr: this.deployLogs[0].args.addr, creator: creator, admin: admin, name: "Zippie-ERC721", symbol: "ZIPPIE-ERC721", baseURI: "URI" });
    });

    it("creates a token with correct details", async function () {
      expect(await this.token.methods.name().call()).to.be.equal("Zippie-ERC721");
      expect(await this.token.methods.symbol().call()).to.be.equal("ZIPPIE-ERC721");
      expect(await this.token.methods.baseURI().call()).to.be.equal("URI");
    });

    it("sets correct admin", async function () {
      expect(await this.token.methods.getRoleMemberCount(DEFAULT_ADMIN_ROLE).call()).to.bignumber.be.equal('2');
      expect(await this.token.methods.hasRole(DEFAULT_ADMIN_ROLE, admin).call()).to.be.equal(true);
      expect(await this.token.methods.hasRole(DEFAULT_ADMIN_ROLE, operator).call()).to.be.equal(true);
    });

    it("sets correct minter", async function () {
      expect(await this.token.methods.getRoleMemberCount(MINTER_ROLE).call()).to.bignumber.be.equal('2');
      expect(await this.token.methods.hasRole(MINTER_ROLE, admin).call()).to.be.equal(true);
      expect(await this.token.methods.hasRole(MINTER_ROLE, operator).call()).to.be.equal(true);
    });

    it("sets correct pauser", async function () {
      expect(await this.token.methods.getRoleMemberCount(PAUSER_ROLE).call()).to.bignumber.be.equal('2');
      expect(await this.token.methods.hasRole(PAUSER_ROLE, admin).call()).to.be.equal(true);
      expect(await this.token.methods.hasRole(PAUSER_ROLE, operator).call()).to.be.equal(true);
    });

    it("does not mint any tokens when deployed", async function () {
      expect(await this.token.methods.totalSupply().call()).to.be.equal('0');
    });

    it("uses gas", async function () {
      console.log(`Gas used for deploy: ${this.deployReceipt.gasUsed}`)	
    });
  })
})
