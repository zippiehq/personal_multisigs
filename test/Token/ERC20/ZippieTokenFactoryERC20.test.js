const { expect } = require("chai")
const { ethers, waffle } = require("hardhat")

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = ethers.utils.solidityKeccak256(['string'],["MINTER_ROLE"])
const PAUSER_ROLE = ethers.utils.solidityKeccak256(['string'],["PAUSER_ROLE"])

describe("ZippieTokenFactoryERC20", () => {

  let accounts, admin, operator, sender, receiver, other;

  beforeEach(async function () {
    accounts = await hre.ethers.getSigners()
    creator = accounts[0].address
    admin = accounts[1].address
    operator = accounts[2].address

    const ZippieTokenFactoryERC20 = await ethers.getContractFactory("ZippieTokenFactoryERC20")
		this.zippieTokenFactoryERC20 = await ZippieTokenFactoryERC20.deploy()
		await this.zippieTokenFactoryERC20.deployed()

    this.receipt = await this.zippieTokenFactoryERC20.deployToken(admin, operator, "Zippie-ERC20", "ZIPPIE-ERC20", 6, { from: creator })
    this.receipt = await this.receipt.wait()
    this.tokenAddress = this.receipt.events.find(e => e.event === "TokenDeployedERC20").args[0]
    this.token = await ethers.getContractAt("ZippieTokenERC20", this.tokenAddress)
  })

  describe('Deploying new Zippie Token ERC20', function() {

    it("emits event with deploy details", async function () {
      const event = this.receipt.events.find(e => e.event === "TokenDeployedERC20")
      expect(event.args[0]).to.equal(this.tokenAddress)
      expect(event.args[1]).to.equal(creator)
      expect(event.args[2]).to.equal(admin)
      expect(event.args[3]).to.equal("Zippie-ERC20")
      expect(event.args[4]).to.equal("ZIPPIE-ERC20")
      expect(event.args[5]).to.equal(6)
    })

    it("creates a token with correct details", async function () {
      expect(await this.token.name()).to.be.equal("Zippie-ERC20")
      expect(await this.token.symbol()).to.be.equal("ZIPPIE-ERC20")
      expect(await this.token.decimals()).to.be.equal(6)
    })

    it("sets correct admin", async function () {
      expect(await this.token.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.be.equal('2')
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.be.equal(true)
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, operator)).to.be.equal(true)
    })

    it("sets correct minter", async function () {
      expect(await this.token.getRoleMemberCount(MINTER_ROLE)).to.be.equal('2')
      expect(await this.token.hasRole(MINTER_ROLE, admin)).to.be.equal(true)
      expect(await this.token.hasRole(MINTER_ROLE, operator)).to.be.equal(true)
    })

    it("sets correct pauser", async function () {
      expect(await this.token.getRoleMemberCount(PAUSER_ROLE)).to.be.equal('2')
      expect(await this.token.hasRole(PAUSER_ROLE, admin)).to.be.equal(true)
      expect(await this.token.hasRole(PAUSER_ROLE, operator)).to.be.equal(true)
    })

    it("does not mint any tokens when deployed", async function () {
      expect(await this.token.totalSupply()).to.be.equal('0')
    })

    it("uses gas", async function () {
      console.log(`Gas used for deploy: ${this.receipt.gasUsed}`)	
    })
  })
})
