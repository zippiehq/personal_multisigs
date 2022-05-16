const hre = require('hardhat')

async function main() {
  const accounts = await hre.ethers.getSigners()
  const sponsor = accounts[0].address
  const operator = accounts[1].address
  const sender = accounts[2].address

  const ZippieTokenERC20 = await ethers.getContractFactory("ZippieTokenERC20")
  this.tokenER20 = await ZippieTokenERC20.deploy(sponsor, operator, "ZIPPIE-ERC20", "ZIPPIE-ERC20", 6)
  await this.tokenER20.deployed() // 0x74530cf1dfd103e8a6bbb3b39850e80b4f234636

  const ZippieTokenERC721 = await ethers.getContractFactory("ZippieTokenERC721")
  this.tokenERC721 = await ZippieTokenERC721.deploy(sponsor, operator, "ZIPPIE-ERC721", "ZIPPIE-ERC721", "baseURI")
  await this.tokenERC721.deployed() // 0xbbe12a27ebcf422fe083d302d069c0617d44c68d

  const BasicERC20Mock = await ethers.getContractFactory("BasicERC20Mock")
  this.basicTokenERC20 = await BasicERC20Mock.deploy('0x1d27c3d920e780abefa6d516620015403bf84cc4')
  await this.basicTokenERC20.deployed() // 0x89c7a7c02520ade056608484f254b5df1a305a09

  const BasicERC721Mock = await ethers.getContractFactory("BasicERC721Mock")
  this.basicTokenERC721 = await BasicERC721Mock.deploy('0x1d27c3d920e780abefa6d516620015403bf84cc4')
  await this.basicTokenERC721.deployed() // 0xf5e0f85a764667b5a7c9b7a5acaa5bfb578e35ab

  const ZippieCardNonces = await ethers.getContractFactory("ZippieCardNonces")
  this.zippieCardNonces = await ZippieCardNonces.deploy()
  await this.zippieCardNonces.deployed() // 0x1ca01c9ff537a374858ac238ff58fce489ec4ec1

  const ZippieWalletERC20 = await ethers.getContractFactory("ZippieWalletERC20")
  this.zippieWalletERC20 = await ZippieWalletERC20.deploy(this.zippieCardNonces.address)
  await this.zippieWalletERC20.deployed() // 0xb133f7779b13ebb792bc4c094d2bc1878034cefe

  const ZippieWalletERC721 = await ethers.getContractFactory("ZippieWalletERC721")
  this.zippieWalletERC721 = await ZippieWalletERC721.deploy(this.zippieCardNonces.address)
  await this.zippieWalletERC721.deployed() //0xd539decb12d095714a6ae84f3cfd254a0e095d59
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

// DEPLOY
// npx hardhat run --network localhost scripts/Zippie-script.js
