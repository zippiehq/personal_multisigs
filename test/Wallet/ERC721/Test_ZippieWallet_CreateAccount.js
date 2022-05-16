const { expect } = require("chai")
const { ethers, waffle } = require("hardhat")

const { 
	createBlankCheck_1of1Signer_1of1Card,
	createBlankCheck_1of1Signer_NoCard,
	getAccountAddress,
	soliditySha3_addresses_m,
	ZERO_ADDRESS,
	MAX_AMOUNT,
} = require('./HelpFunctions')

describe("ERC721 - ZippieWallet (using CREATE2 to approve ERC721 transfers for accounts)", () => {

	let basicToken, basicToken2;
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

		// pay my gas server 
		sponsorAccounts = [
			accounts[0],
			accounts[19]
		] 
		
		// token account
		tokenAccounts = [
			accounts[5]
		]
		
		// signer (1of1)
		signerAccounts = [
			accounts[0]
		]

		// random verification key
		verificationKeys = [
			accounts[4], 
			accounts[14],
			accounts[15]
		]

		// token recipient
		recipientAccounts = [
			accounts[2]
		]

		const BasicERC721Mock = await ethers.getContractFactory("BasicERC721Mock")
		basicToken = await BasicERC721Mock.deploy(sponsor)
		await basicToken.deployed()

		basicToken2 = await BasicERC721Mock.deploy(sponsor)
		await basicToken2.deployed()

		const ZippieCardNonces = await ethers.getContractFactory("ZippieCardNonces")
		zippieCardNonces = await ZippieCardNonces.deploy()
		await zippieCardNonces.deployed()

		const ZippieWallet = await ethers.getContractFactory("ZippieWalletERC721")
		zippieWallet = await ZippieWallet.deploy(zippieCardNonces.address)

		await zippieWallet.deployed()
	})

	describe("test account creation with CREATE2", function() {		
		it("redeemBlankCheck m[1,1,0,0]", async () => {
			// Blank Check 1 (tokenId 1)
			const bc1 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0].address,
				verificationKeys[0],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)
			
			// Blank Check 2 (tokenId 2)
			const bc2 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0].address,
				verificationKeys[1],
				signerAccounts[0],
				[1, 1, 0, 0],
				"2",
			)

			// Get account address	
			const accountAddress = getAccountAddress(bc1.signers, bc1.m, zippieWallet.address)

			// Blank Check 3 (tokenId 3)
			const bc3 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				accountAddress,
				verificationKeys[2],
				signerAccounts[0],
				[1, 1, 0, 0],
				"3",
			)

			// BC1

			// Send tokens to account
			await basicToken.transferFrom(sponsor, accountAddress, "1", { from: sponsor })
			const ownerOfToken1Before = await basicToken.ownerOf("1")
			expect(ownerOfToken1Before).to.equal(accountAddress)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(ZERO_ADDRESS)
			const approvalBefore = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalBefore).to.equal(false)

			// Redeem blank check and create account
			let tx = zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx).to.emit(basicToken, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, "1")
			await expect(tx).to.emit(basicToken, 'ApprovalForAll').withArgs(accountAddress, zippieWallet.address, true)
			// tx = await tx.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0]: ${tx.gasUsed}`)

			// Check owner and operator approval after redeem
			const ownerOfToken1After = await basicToken.ownerOf("1")
			expect(ownerOfToken1After).to.equal(recipientAccounts[0].address)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(recipientAccounts[0].address)
			const approvalAfter = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalAfter).to.equal(true)

			await expect(zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[0].address}))
				.to.be.revertedWith("Nonce already used")

			// BC2

			// Send tokens to account
			await basicToken.transferFrom(sponsor, accountAddress, "2", { from: sponsor })
			const ownerOfToken2Before = await basicToken.ownerOf("2")
			expect(ownerOfToken2Before).to.equal(accountAddress)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[1].address)).to.equal(ZERO_ADDRESS)

			// Redeem second blank check (no create account, was done in previous call)
			let tx2 = zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.tokenId, bc2.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx2).to.emit(basicToken, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, "2")
			await expect(tx2).to.not.emit(basicToken, 'ApprovalForAll')
			// tx2 = await tx2.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0]: ${tx2.gasUsed}`)

			// Check owner after redeem
			const ownerOfToken2After = await basicToken.ownerOf("2")
			expect(ownerOfToken2After).to.equal(recipientAccounts[0].address)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[1].address)).to.equal(recipientAccounts[0].address)
			const approvalAfter2 = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalAfter2).to.equal(true)

			// BC3

			// Send tokens to account
			await basicToken.transferFrom(sponsor, accountAddress, "3", { from: sponsor })
			const ownerOfToken3Before = await basicToken.ownerOf("3")
			expect(ownerOfToken3Before).to.equal(accountAddress)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[2].address)).to.equal(ZERO_ADDRESS)

			// Redeem third blank check back to sender (i.e. cancel)
			let tx3 = zippieWallet.redeemBlankCheck(bc3.addresses, bc3.signers, bc3.m, bc3.signatures.v, bc3.signatures.r, bc3.signatures.s, bc3.tokenId, bc3.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx3).to.not.emit(basicToken, 'Transfer')
			await expect(tx3).to.not.emit(basicToken, 'ApprovalForAll')
			// tx3 = await tx3.wait()
			// console.log(`Gas used for redeemBlankCheck w/o transfer (i.e. cacnel) m[1,1,0,0]: ${tx3.gasUsed}`)

			// Check owner after redeem
			const ownerOfToken3After = await basicToken.ownerOf("3")
			expect(ownerOfToken3After).to.equal(accountAddress)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[2].address)).to.equal(accountAddress)
			const approvalAfter3 = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalAfter3).to.equal(true)
		})

		it("redeemBlankCheck m[1,1,1,1]", async () => {
			// Blank Check 1
			const bc1 = await createBlankCheck_1of1Signer_1of1Card(
				basicToken.address,
				recipientAccounts[0].address,
				verificationKeys[0],
				signerAccounts[0],
				1,
				[1, 1, 1, 1],
				"1",
				0
			)
			
			// Blank Check 2
			const bc2 = await createBlankCheck_1of1Signer_1of1Card(
				basicToken.address,
				recipientAccounts[0].address,
				verificationKeys[1],
				signerAccounts[0],
				1,
				[1, 1, 1, 1],
				"2",
				1
			)

			// Get account address	
			const accountAddress = getAccountAddress(bc1.signers, bc1.m, zippieWallet.address)

			// Send tokens to account
			await basicToken.transferFrom(sponsor, accountAddress, "1", { from: sponsor })
			const ownerOfToken1Before = await basicToken.ownerOf("1")
			expect(ownerOfToken1Before).to.equal(accountAddress)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(ZERO_ADDRESS)
			const approvalBefore = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalBefore).to.equal(false)

			// Redeem blank check and create account
			let tx = zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx).to.emit(basicToken, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, "1")
			await expect(tx).to.emit(basicToken, 'ApprovalForAll').withArgs(accountAddress, zippieWallet.address, true)
			// tx = await tx.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,1,1]: ${tx.gasUsed}`)

			// Check owner and operator approval after redeem
			const ownerOfToken1After = await basicToken.ownerOf("1")
			expect(ownerOfToken1After).to.equal(recipientAccounts[0].address)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(recipientAccounts[0].address)
			const approvalAfter = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalAfter).to.equal(true)

			await expect(zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[0].address}))
				.to.be.revertedWith("Nonce already used")

			// BC2

			// Send tokens to account
			await basicToken.transferFrom(sponsor, accountAddress, "2", { from: sponsor })
			const ownerOfToken2Before = await basicToken.ownerOf("2")
			expect(ownerOfToken2Before).to.equal(accountAddress)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[1].address)).to.equal(ZERO_ADDRESS)

			// Redeem second blank check (no create account, was done in previous call)
			let tx2 = zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.tokenId, bc2.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx2).to.emit(basicToken, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, "2")
			await expect(tx2).to.not.emit(basicToken, 'ApprovalForAll')
			// tx2 = await tx2.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,1,1]: ${tx2.gasUsed}`)

			// Check owner after redeem
			const ownerOfToken2After = await basicToken.ownerOf("2")
			expect(ownerOfToken2After).to.equal(recipientAccounts[0].address)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[1].address)).to.equal(recipientAccounts[0].address)
			const approvalAfter2 = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalAfter2).to.equal(true)
		})

		it("redeemBlankCheck m[1,1,0,0] with 2 tokens (2 approve)", async () => {
			// Blank Check 1
			const bc1 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0].address,
				verificationKeys[0],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)
			
			// Blank Check 2
			const bc2 = await createBlankCheck_1of1Signer_NoCard(
				basicToken2.address,
				recipientAccounts[0].address,
				verificationKeys[1],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)

			// Get account address	
			const accountAddress = getAccountAddress(bc1.signers, bc1.m, zippieWallet.address)		

			// Send token 1 to account
			await basicToken.transferFrom(sponsor, accountAddress, "1", { from: sponsor })
			const ownerOfToken1Before = await basicToken.ownerOf("1")
			expect(ownerOfToken1Before).to.equal(accountAddress)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(ZERO_ADDRESS)
			const approvalBefore = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalBefore).to.equal(false)

			// Redeem blank check and create account
			let tx = zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx).to.emit(basicToken, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, "1")
			await expect(tx).to.emit(basicToken, 'ApprovalForAll').withArgs(accountAddress, zippieWallet.address, true)
			// tx = await tx.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0] - Token 1: ${tx.gasUsed}`)

			// Check owner and operator approval after redeem
			const ownerOfToken1After = await basicToken.ownerOf("1")
			expect(ownerOfToken1After).to.equal(recipientAccounts[0].address)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(recipientAccounts[0].address)
			const approvalAfter = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalAfter).to.equal(true)

			// Send token 2 to account
			await basicToken2.transferFrom(sponsor, accountAddress, "1", { from: sponsor })
			const ownerOfToken2Before = await basicToken2.ownerOf("1")
			expect(ownerOfToken2Before).to.equal(accountAddress)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[1].address)).to.equal(ZERO_ADDRESS)
			const approvalBefore2 = await basicToken2.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalBefore2).to.equal(false)

			// Redeem blank check and create account
			let tx2 = zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.tokenId, bc2.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx2).to.emit(basicToken2, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, "1")
			await expect(tx2).to.emit(basicToken2, 'ApprovalForAll').withArgs(accountAddress, zippieWallet.address, true)
			// tx2 = await tx2.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0] - Token 2: ${tx.gasUsed}`)

			// Check owner and operator approval after redeem
			const ownerOfToken2After = await basicToken2.ownerOf("1")
			expect(ownerOfToken2After).to.equal(recipientAccounts[0].address)
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[1].address)).to.equal(recipientAccounts[0].address)
			const approvalAfter2 = await basicToken2.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(approvalAfter2).to.equal(true)
		})

		it("send ether to account and kill contract with an approve to get the ether to the sponsor", async () => {
			// Blank Check 1
			const bc1 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0].address,
				verificationKeys[0],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)

			// Get account address	
			const accountAddress = getAccountAddress(bc1.signers, bc1.m, zippieWallet.address)
			const salt = soliditySha3_addresses_m(bc1.signers, bc1.m)
			const accountAddressSolidity = await zippieWallet.getAccountAddress(salt, {from: sponsorAccounts[0].address})
			expect(accountAddress).to.equal(accountAddressSolidity)

			// Send tokens to account
			await basicToken.transferFrom(sponsor, accountAddress, "1", { from: sponsor })

			// Send ETH to account
			const balanceBefore = await waffle.provider.getBalance(accountAddress)
			expect(balanceBefore.toString()).to.equal("0")
			let receiptTranfer = await sponsorAccounts[0].sendTransaction({to: accountAddress, value: ethers.utils.parseUnits("1", "ether")})
			receiptTranfer = await receiptTranfer.wait()
			console.log(`Gas used for ETH transfer: ${receiptTranfer.gasUsed}`)
			const balanceAfter = await waffle.provider.getBalance(accountAddress)
			expect(balanceAfter).to.equal(ethers.utils.parseUnits("1", "ether"))
			
			// Redeem blank check and create account (approve a token and check allowance)
			const sponsorBalanceBefore = await waffle.provider.getBalance(sponsorAccounts[1].address)
			const allowanceBefore = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(allowanceBefore).to.equal(false)
			const zippieWallet2 = zippieWallet.connect(sponsorAccounts[1])
			let receiptRedeemBlankCheck = await zippieWallet2.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[1].address })
			receiptRedeemBlankCheck = await receiptRedeemBlankCheck.wait()
			const gasUsed = receiptRedeemBlankCheck.gasUsed
			const gasPrice = receiptRedeemBlankCheck.effectiveGasPrice
			console.log(`Gas used for redeemBlankCheck: ${gasUsed}, (${gasUsed.mul(gasPrice)})`)
			const allowanceAfter = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			expect(allowanceAfter).to.equal(true)
						
			// Check if ETH was transfered correctly to sponsor after selfdestruct(tx.origin)
			const accountBalanceAfterSelfdestruct = await waffle.provider.getBalance(accountAddress)
			expect(accountBalanceAfterSelfdestruct).to.equal("0")
			const sponsorBalanceAfter = await waffle.provider.getBalance(sponsorAccounts[1].address)
			const balanceIncrease = sponsorBalanceAfter.sub(sponsorBalanceBefore).add(gasUsed.mul(gasPrice))
			expect(balanceIncrease).to.equal(ethers.utils.parseUnits("1", "ether"))
		})	

		it("gas used for normal ERC721 transfer and setApprovalForAll + transferFrom", async () => {
			let receiptTranfer = await basicToken.transferFrom(sponsorAccounts[0].address, recipientAccounts[0].address, "1", { from: sponsorAccounts[0].address })
			receiptTranfer = await receiptTranfer.wait()
			console.log(`Gas used for ERC721 tranferFrom (owner) - Transfer 1: ${receiptTranfer.gasUsed}`)		
			let receiptTranfer2 = await basicToken.transferFrom(sponsorAccounts[0].address, recipientAccounts[0].address, "2", { from: sponsorAccounts[0].address })
			receiptTranfer2 = await receiptTranfer2.wait()
			console.log(`Gas used for ERC721 tranferFrom (owner) - Transfer 2: ${receiptTranfer2.gasUsed}`)	
			let receiptTranfer3 = await basicToken.transferFrom(sponsorAccounts[0].address, recipientAccounts[0].address, "3", { from: sponsorAccounts[0].address })
			receiptTranfer3 = await receiptTranfer3.wait()
			console.log(`Gas used for ERC721 tranferFrom (owner) - Transfer 3: ${receiptTranfer3.gasUsed}`)		
			let receiptApprove = await basicToken.setApprovalForAll(tokenAccounts[0].address, true , {from: sponsorAccounts[0].address})
			receiptApprove = await receiptApprove.wait()
			console.log(`Gas used for ERC721 setApprovalForAll: ${receiptApprove.gasUsed}`)

			const basicTokenFrom = basicToken.connect(tokenAccounts[0])
			let receiptTranferFrom = await basicTokenFrom.transferFrom(sponsorAccounts[0].address, recipientAccounts[0].address, "4", { from: tokenAccounts[0].address })
			receiptTranferFrom = await receiptTranferFrom.wait()
			console.log(`Gas used for ERC721 tranferFrom - Transfer 1: ${receiptTranferFrom.gasUsed}`)
			let receiptTranferFrom2 = await basicTokenFrom.transferFrom(sponsorAccounts[0].address, recipientAccounts[0].address, "5", { from: tokenAccounts[0].address })
			receiptTranferFrom2 = await receiptTranferFrom2.wait()
			console.log(`Gas used for ERC721 tranferFrom - Transfer 2: ${receiptTranferFrom2.gasUsed}`)
			let receiptTranferFrom3 = await basicTokenFrom.transferFrom(sponsorAccounts[0].address, recipientAccounts[0].address, "6", { from: tokenAccounts[0].address })
			receiptTranferFrom3 = await receiptTranferFrom3.wait()
			console.log(`Gas used for ERC721 tranferFrom - Transfer 3: ${receiptTranferFrom3.gasUsed}`)	
		})
	})
})