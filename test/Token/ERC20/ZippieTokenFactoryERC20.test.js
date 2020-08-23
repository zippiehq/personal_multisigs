const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { expect } = require('chai');
const { abi:tokenAbi, bytecode:tokenBytecode } = require('../../../build/contracts/ZippieTokenERC20.json')
const ZippieTokenFactoryERC20 = artifacts.require("ZippieTokenFactoryERC20");

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = web3.utils.keccak256("MINTER_ROLE")
const PAUSER_ROLE = web3.utils.keccak256("PAUSER_ROLE")

contract("ZippieTokenFactoryERC20", ([creator, admin, operator]) => {

  beforeEach(async function () {
    this.zippieTokenFactoryERC20 = await ZippieTokenFactoryERC20.new({ from: admin })
  })

  describe('Deploying new Zippie Token ERC20', function() {
    beforeEach(async function () {
      const { logs, receipt } = await this.zippieTokenFactoryERC20.deployToken(
        admin, 
        operator,
        "Zippie-ERC20",
        "ZIPPIE-ERC20",
        6,
        { from: creator }
      )

      this.deployLogs = logs
      this.deployReceipt = receipt
      this.token = new web3.eth.Contract(tokenAbi, this.deployLogs[0].args.addr)
    });

    it("emits event with deploy details", async function () {
      expectEvent.inLogs(this.deployLogs, "TokenDeployedERC20", { addr: this.deployLogs[0].args.addr, creator: creator, admin: admin, name: "Zippie-ERC20", symbol: "ZIPPIE-ERC20", decimals: "6" });
    });

    it("creates a token with correct details", async function () {
      expect(await this.token.methods.name().call()).to.be.equal("Zippie-ERC20");
      expect(await this.token.methods.symbol().call()).to.be.equal("ZIPPIE-ERC20");
      expect(await this.token.methods.decimals().call()).to.be.equal("6");
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
