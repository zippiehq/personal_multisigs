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
 
 describe("ERC721 - Test Zippie Multisig Check Cashing Error Cases", () => {

	let basicToken;
	let zippieCardNonces;
	let zippieWallet;
	let accounts, signer, signer2, recipient, verificationKey, sponsor, incorrectSigner;
	
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
		incorrectSigner = accounts[7].address
		incorrectSignerAccount = accounts[7]
		wrongVerificationKey = accounts[8].address
		wrongVerificationKeyAccount = accounts[8]


		const BasicERC721Mock = await ethers.getContractFactory("BasicERC721Mock")
		basicToken = await BasicERC721Mock.deploy(sponsor)
		await basicToken.deployed()

		const ZippieCardNonces = await ethers.getContractFactory("ZippieCardNonces")
		zippieCardNonces = await ZippieCardNonces.deploy()
		await zippieCardNonces.deployed()

		const ZippieWallet = await ethers.getContractFactory("ZippieWalletERC721")
		zippieWallet = await ZippieWallet.deploy(zippieCardNonces.address)

		await zippieWallet.deployed()
	})

	it("should fail a blank check transfer (from a 1 of 1 multisig) if incorrect signer", async () => {
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, { from: sponsor })
		const addresses = [basicToken.address, recipient, verificationKey]

		const incorrectSigners = [incorrectSigner]

		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, signerAccount, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKeyAccount)

		const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		
		const amount = "1"
		await expect(zippieWallet.redeemBlankCheck(addresses, incorrectSigners, m, signature.v, signature.r, signature.s, tokenId, [], { from: sponsor }))
			.to.be.revertedWith("Invalid address found when verifying signer signatures")

		await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [], {from: sponsor})
		
		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)	
		expect((initialBalanceSender - newBalanceSender).toString()).to.equal(amount)
		expect((newBalanceRecipient - initialBalanceRecipient).toString()).to.equal(amount)
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(recipient)
	})

	it("should fail a blank check transfer (from a 1 of 1 multisig) if data is signed by incorrect signer", async () => {
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, { from: sponsor })
		const addresses = [basicToken.address, recipient, verificationKey]

		// sign incorrect data
		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, incorrectSignerAccount, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKeyAccount)

		const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		
		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [], { from: sponsor }))
			.to.be.revertedWith("Invalid address found when verifying signer signatures")
		
		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)
		expect(initialBalanceSender.toString()).to.equal(newBalanceSender.toString())
		expect(initialBalanceRecipient.toString()).to.equal(newBalanceRecipient.toString())
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
	})

	it("should fail a blank check transfer (from a 2 of 2 multisig) if 1 incorrect signer", async () => {
		const signers = [signer, signer2]
		const m = [2, 2, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, { from: sponsor })
		const addresses = [basicToken.address, recipient, verificationKey]

		const incorrectSigners = [incorrectSigner, signer2]

		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, signerAccount, tokenId, addresses[0])
		const blankCheckSignature2 = await getBlankCheckSignature(verificationKeyAccount, signer2Account, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKeyAccount)

		const signature = getSignature(blankCheckSignature, blankCheckSignature2, recipientSignature)

		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		
		await expect(zippieWallet.redeemBlankCheck(addresses, incorrectSigners, m, signature.v, signature.r, signature.s, tokenId, [], { from: sponsor }))
			.to.be.revertedWith("Invalid address found when verifying signer signatures")
		
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
	})

	it("should fail a blank check transfer (from a 2 of 2 multisig) if data is signed by incorrect signer", async () => {
		const signers = [signer, signer2]
		const m = [2, 2, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, { from: sponsor })
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, incorrectSignerAccount, tokenId, addresses[0])
		const blankCheckSignature2 = await getBlankCheckSignature(verificationKeyAccount, signer2Account, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKeyAccount, addresses[0])

		const signature = getSignature(blankCheckSignature, blankCheckSignature2, recipientSignature)

		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		
		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [], { from: sponsor }))
			.to.be.revertedWith("Invalid address found when verifying signer signatures")
		
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
	})

	it("should fail a blank check transfer (from a 2 of 2 multisig) if signers are the same", async () => {
		const signers = [signer, signer]
		const m = [2, 2, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, { from: sponsor })
		const addresses = [basicToken.address, recipient, verificationKey]
		
		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, signerAccount, tokenId, addresses[0])
		const blankCheckSignature2 = await getBlankCheckSignature(verificationKeyAccount, signer2Account, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKeyAccount)

		const signature = getSignature(blankCheckSignature, blankCheckSignature2, recipientSignature)

		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		
		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [], { from: sponsor }))
			.to.be.revertedWith("Invalid address found when verifying signer signatures")
		
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
	})

	it("should fail a blank check transfer when the verificationKey is wrong", async () => {
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, { from: sponsor })
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, signerAccount, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, wrongVerificationKeyAccount)

		const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		const addresses2 = [basicToken.address, recipient, wrongVerificationKey]
		
		await expect(zippieWallet.redeemBlankCheck(addresses2, signers, m, signature.v, signature.r, signature.s, tokenId, [], { from: sponsor }))
			.to.be.revertedWith("Invalid address found when verifying signer signatures")

		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [], { from: sponsor }))
			.to.be.revertedWith("Invalid nonce")
		
		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)	
		expect((initialBalanceSender - newBalanceSender).toString()).to.equal("0")
		expect((newBalanceRecipient - initialBalanceRecipient).toString()).to.equal("0")
		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
	})

	it("should fail a blank check transfer (from a 1 of 1 multisig) if multisig is not owner of tokenId", async () => {
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKeyAccount, signerAccount, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKeyAccount)

		const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)

		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
		
		const ownerOfToken1 = await basicToken.ownerOf(tokenId)
		expect(ownerOfToken1.toLowerCase()).to.not.equal(multisig)

		await expect(zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [], { from: sponsor }))
			.to.be.revertedWith("ERC721: transfer caller is not owner nor approved")

		expect(await zippieWallet.usedNonces(multisig, verificationKey)).to.equal(ZERO_ADDRESS)
	})
})