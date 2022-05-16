const { expect } = require("chai")
const { ethers } = require("hardhat")

const {
	getAccountAddress,
	getRecipientSignature,
	getSignature,
	getBlankCheckSignature,
	getSignatureNoCard,
	ZERO_ADDRESS,
 } = require("./HelpFunctions")
 
describe("ERC20 - Test Zippie Multisig Check Cashing Functionality", () => {

	let basicToken;
	let zippieCardNonces;
	let zippieWallet;
	let accounts, signer, signer2, recipient, verificationKey, sponsor;
	
	beforeEach(async () => {
		accounts = await hre.ethers.getSigners()
		signer = accounts[6].address // multisig signer (1of1)
		signerAccount = accounts[6] // multisig signer (1of1)
		signer2 = accounts[2].address // multisig signer (2of2)
		signer2Account = accounts[2] // multisig signer (2of2)
		recipient = accounts[2].address
		recipientAccount = accounts[2]
		verificationKey = accounts[4].address // random verification key
		verificationKeyAccount = accounts[4] // random verification key
		sponsor = accounts[0].address // Zippie PMG server
		sponsorAccount = accounts[0] // Zippie PMG server

		const BasicERC20Mock = await ethers.getContractFactory("BasicERC20Mock")
		basicToken = await BasicERC20Mock.deploy(sponsor)
		await basicToken.deployed()

		const ZippieCardNonces = await ethers.getContractFactory("ZippieCardNonces")
		zippieCardNonces = await ZippieCardNonces.deploy()
		await zippieCardNonces.deployed()

		const ZippieWallet = await ethers.getContractFactory("ZippieWalletERC20")
		zippieWallet = await ZippieWallet.deploy(zippieCardNonces.address)

		await zippieWallet.deployed()
	})

	it("should allow a blank check to be cashed once from a 1 of 1 multisig, and fail the second time", async () => {
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		await basicToken.transfer(multisig, ethers.utils.parseUnits("100", "ether"), { from: sponsor })
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, signerAccount, "1", addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKeyAccount)

		const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		
		const amount = ethers.utils.parseUnits("1", "ether").toString()
		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], { from: sponsor }))
			.to.emit(basicToken, 'Transfer')
			.withArgs(multisig, recipient, amount)

		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)	
		expect((initialBalanceSender - newBalanceSender).toString()).to.equal(amount)
		expect((newBalanceRecipient - initialBalanceRecipient).toString()).to.equal(amount)
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(recipient)

		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], { from: sponsor }))
			.to.be.revertedWith("Nonce already used")
	})

	it("should allow a blank check to be cashed from a 2 of 2 multisig", async () => {
		const signers = [signer, signer2]
		const m = [2, 2, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		await basicToken.transfer(multisig, ethers.utils.parseUnits("100", "ether"), { from: sponsor })
		const addresses = [basicToken.address, recipient, verificationKey]
		
		const blankCheckAmount = "1"
		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, signerAccount, blankCheckAmount, addresses[0])
		const blankCheckSignature2 = await getBlankCheckSignature(verificationKeyAccount, signer2Account, blankCheckAmount, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKeyAccount)

		const signature = getSignature(blankCheckSignature, blankCheckSignature2, recipientSignature)

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		
		const amount = ethers.utils.parseUnits(blankCheckAmount, "ether").toString()
		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], { from: sponsor }))
			.to.emit(basicToken, 'Transfer')
			.withArgs(multisig, recipient, amount)
		
		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)
		expect((initialBalanceSender - newBalanceSender).toString()).to.equal(amount)
		expect((newBalanceRecipient - initialBalanceRecipient).toString()).to.equal(amount)
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(recipient)
	})

	it("should allow a blank check to be cashed back to same account without tranfering tokens (i.e. 'cancelled')", async () => {
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		await basicToken.transfer(multisig, ethers.utils.parseUnits("100", "ether"), { from: sponsor })
		const addresses = [basicToken.address, multisig, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, signerAccount, "1", addresses[0])
		const recipientSignature = await getRecipientSignature(multisig, verificationKeyAccount)

		const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		
		const amount = ethers.utils.parseUnits("1", "ether").toString()
		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], { from: sponsor }))
			.to.not.emit(basicToken, 'Transfer')
				
		const newBalanceSender = await basicToken.balanceOf(multisig)	
		expect(initialBalanceSender.toString()).to.equal(newBalanceSender.toString())
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(multisig)

		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], { from: sponsor }))
			.to.be.revertedWith("Nonce already used")
	})

	it("should allow a blank check to be 'cancelled' when balance is 0", async () => {
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const addresses = [basicToken.address, multisig, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, signerAccount, "1", addresses[0])
		const recipientSignature = await getRecipientSignature(multisig, verificationKeyAccount)

		const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		expect(initialBalanceSender.toString()).to.equal("0")
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		
		const amount = ethers.utils.parseUnits("1", "ether").toString()
		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], { from: sponsor }))
			.to.not.emit(basicToken, 'Transfer')
		
		const newBalanceSender = await basicToken.balanceOf(multisig)	
		expect(initialBalanceSender.toString()).to.equal(newBalanceSender.toString())
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(multisig)

		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], { from: sponsor }))
			.to.be.revertedWith("Nonce already used")
	})
})