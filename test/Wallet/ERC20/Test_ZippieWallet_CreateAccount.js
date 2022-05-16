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

describe("ERC20 - ZippieWallet (using CREATE2 to approve ERC20 transfers for accounts)", () => {

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

		const BasicERC20Mock = await ethers.getContractFactory("BasicERC20Mock")
		basicToken = await BasicERC20Mock.deploy(sponsor)
		await basicToken.deployed()

		basicToken2 = await BasicERC20Mock.deploy(sponsor)
		await basicToken2.deployed()

		const ZippieCardNonces = await ethers.getContractFactory("ZippieCardNonces")
		zippieCardNonces = await ZippieCardNonces.deploy()
		await zippieCardNonces.deployed()

		const ZippieWallet = await ethers.getContractFactory("ZippieWalletERC20")
		zippieWallet = await ZippieWallet.deploy(zippieCardNonces.address)

		await zippieWallet.deployed()
	})

	describe("test account creation with CREATE2", function() {		
		it("redeemBlankCheck m[1,1,0,0]", async () => {
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
				basicToken.address,
				recipientAccounts[0].address,
				verificationKeys[1],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)

			// Get account address	
			const accountAddress = getAccountAddress(bc1.signers, bc1.m, zippieWallet.address)

			// Blank Check 3
			const bc3 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				accountAddress,
				verificationKeys[2],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)

			// Send tokens to account
			await basicToken.transfer(accountAddress, ethers.utils.parseUnits("100", "ether"), { from: sponsor })

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0].address)
			expect(balanceOfSender.toString()).to.equal(ethers.utils.parseUnits("100", "ether"))
			expect(balanceOfRecipient.toString()).to.equal(ethers.utils.parseUnits("0", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(ZERO_ADDRESS)
			
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			expect(allowanceBefore.toString()).to.equal("0")

			// Redeem blank check and create account
			let tx = zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx).to.emit(basicToken, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"))
			await expect(tx).to.emit(basicToken, 'Approval').withArgs(accountAddress, zippieWallet.address, MAX_AMOUNT)
			// tx = await tx.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0]: ${tx.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0].address)
			expect(balanceOfSender.toString()).to.equal(ethers.utils.parseUnits("99", "ether"))
			expect(balanceOfRecipient.toString()).to.equal(ethers.utils.parseUnits("1", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(recipientAccounts[0].address)

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			expect(allowanceAfter > 0).to.equal(true)

			await expect(zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0].address}))
				.to.be.revertedWith("Nonce already used")

			// Redeem second blank check (no create account, was done in previous call)
			let tx2 = zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.amount, bc2.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx2).to.emit(basicToken, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"))
			await expect(tx2).to.not.emit(basicToken, 'Approval')
			// tx2 = await tx2.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0]: ${tx2.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0].address)
			expect(balanceOfSender.toString()).to.equal(ethers.utils.parseUnits("98", "ether"))
			expect(balanceOfRecipient.toString()).to.equal(ethers.utils.parseUnits("2", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[1].address)).to.equal(recipientAccounts[0].address)

			// Redeem third blank check back to sender (i.e. cancel)
			let tx3 = zippieWallet.redeemBlankCheck(bc3.addresses, bc3.signers, bc3.m, bc3.signatures.v, bc3.signatures.r, bc3.signatures.s, bc3.amount, bc3.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx3).to.not.emit(basicToken, 'Transfer')
			await expect(tx3).to.not.emit(basicToken, 'Approval')
			// tx3 = await tx3.wait()
			// console.log(`Gas used for redeemBlankCheck w/o transfer (i.e. cacnel) m[1,1,0,0]: ${tx3.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			expect(balanceOfSender.toString()).to.equal(ethers.utils.parseUnits("98", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[2].address)).to.equal(accountAddress)
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
				"1",
				1
			)

			// Get account address	
			const accountAddress = getAccountAddress(bc1.signers, bc1.m, zippieWallet.address)

			// Send tokens to account
			await basicToken.transfer(accountAddress, ethers.utils.parseUnits("100", "ether"), { from: sponsor })

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0].address)
			expect(balanceOfSender.toString()).to.equal(ethers.utils.parseUnits("100", "ether"))
			expect(balanceOfRecipient.toString()).to.equal(ethers.utils.parseUnits("0", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(ZERO_ADDRESS)

			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			expect(allowanceBefore.toString()).to.equal("0")

			// Redeem blank check and create account
			let tx = zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx).to.emit(basicToken, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"))
			await expect(tx).to.emit(basicToken, 'Approval').withArgs(accountAddress, zippieWallet.address, MAX_AMOUNT)
			// tx = await tx.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,1,1]: ${tx.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0].address)
			expect(balanceOfSender.toString()).to.equal(ethers.utils.parseUnits("99", "ether"))
			expect(balanceOfRecipient.toString()).to.equal(ethers.utils.parseUnits("1", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(recipientAccounts[0].address)

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			expect(allowanceAfter > 0).to.equal(true)

			await expect(zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0].address}))
				.to.be.revertedWith("Nonce already used")

			// Redeem second blank check (no create account, was done in previous call)
			let tx2 = zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.amount, bc2.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx2).to.emit(basicToken, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"))
			await expect(tx2).to.not.emit(basicToken, 'Approval')
			// tx2 = await tx2.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,1,1]: ${tx2.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0].address)
			expect(balanceOfSender.toString()).to.equal(ethers.utils.parseUnits("98", "ether"))
			expect(balanceOfRecipient.toString()).to.equal(ethers.utils.parseUnits("2", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[1].address)).to.equal(recipientAccounts[0].address)
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
			await basicToken.transfer(accountAddress, ethers.utils.parseUnits("100", "ether"), { from: sponsor })

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0].address)
			expect(balanceOfSender.toString()).to.equal(ethers.utils.parseUnits("100", "ether"))
			expect(balanceOfRecipient.toString()).to.equal(ethers.utils.parseUnits("0", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(ZERO_ADDRESS)

			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			expect(allowanceBefore.toString()).to.equal("0")

			// Redeem blank check and approve token 1
			let tx = zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx).to.emit(basicToken, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"))
			await expect(tx).to.emit(basicToken, 'Approval').withArgs(accountAddress, zippieWallet.address, MAX_AMOUNT)
			// tx = await tx.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0] - Token 1: ${tx.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0].address)
			expect(balanceOfSender.toString()).to.equal(ethers.utils.parseUnits("99", "ether"))
			expect(balanceOfRecipient.toString()).to.equal(ethers.utils.parseUnits("1", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[0].address)).to.equal(recipientAccounts[0].address)

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			expect(allowanceAfter > 0).to.equal(true)

			// Send token 2 to account
			await basicToken2.transfer(accountAddress, ethers.utils.parseUnits("100", "ether"), { from: sponsor })

			let balanceOfSender2 = await basicToken2.balanceOf(accountAddress)
			let balanceOfRecipient2 = await basicToken2.balanceOf(recipientAccounts[0].address)
			expect(balanceOfSender2.toString()).to.equal(ethers.utils.parseUnits("100", "ether"))
			expect(balanceOfRecipient2.toString()).to.equal(ethers.utils.parseUnits("0", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[1].address)).to.equal(ZERO_ADDRESS)

			const allowanceBefore2 = await basicToken2.allowance(accountAddress, zippieWallet.address)
			expect(allowanceBefore2.toString()).to.equal("0")

			// Redeem blank check and approve token 1
			let tx2 = zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.amount, bc2.cardNonces, {from: sponsorAccounts[0].address})
			await expect(tx2).to.emit(basicToken2, 'Transfer').withArgs(accountAddress, recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"))
			await expect(tx2).to.emit(basicToken2, 'Approval').withArgs(accountAddress, zippieWallet.address, MAX_AMOUNT)
			// tx2 = await tx2.wait()
			// console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0] - Token 2: ${tx2.gasUsed}`)

			balanceOfSender2 = await basicToken2.balanceOf(accountAddress)
			balanceOfRecipient2 = await basicToken2.balanceOf(recipientAccounts[0].address)
			expect(balanceOfSender2.toString()).to.equal(ethers.utils.parseUnits("99", "ether"))
			expect(balanceOfRecipient2.toString()).to.equal(ethers.utils.parseUnits("1", "ether"))
			expect(await zippieWallet.usedNonces(accountAddress, verificationKeys[1].address)).to.equal(recipientAccounts[0].address)

			const allowanceAfter2 = await basicToken2.allowance(accountAddress, zippieWallet.address)
			expect(allowanceAfter2 > 0).to.equal(true)
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
			await basicToken.transfer(accountAddress, ethers.utils.parseUnits("100", "ether"), { from: sponsorAccounts[0].address })

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
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			expect(allowanceBefore.toString()).to.equal("0")
			const zippieWallet2 = zippieWallet.connect(sponsorAccounts[1])
			let receiptRedeemBlankCheck = await zippieWallet2.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[1].address })
			receiptRedeemBlankCheck = await receiptRedeemBlankCheck.wait()
			const gasUsed = receiptRedeemBlankCheck.gasUsed
			const gasPrice = receiptRedeemBlankCheck.effectiveGasPrice
			console.log(`Gas used for redeemBlankCheck: ${gasUsed}, (${gasUsed.mul(gasPrice)})`)
			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			expect(allowanceAfter > 0).to.equal(true)
						
			// Check if ETH was transfered correctly to sponsor after selfdestruct(tx.origin)
			const accountBalanceAfterSelfdestruct = await waffle.provider.getBalance(accountAddress)
			expect(accountBalanceAfterSelfdestruct).to.equal("0")
			const sponsorBalanceAfter = await waffle.provider.getBalance(sponsorAccounts[1].address)
			const balanceIncrease = sponsorBalanceAfter.sub(sponsorBalanceBefore).add(gasUsed.mul(gasPrice))
			expect(balanceIncrease).to.equal(ethers.utils.parseUnits("1", "ether"))
		})	

		it("gas used for normal ERC20 transfer and approve + transferFrom", async () => {
			let receiptTranfer = await basicToken.transfer(recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"), {from: sponsorAccounts[0].address})
			receiptTranfer = await receiptTranfer.wait()
			console.log(`Gas used for ERC20 transfer - Transfer 1: ${receiptTranfer.gasUsed}`)		
			let receiptTranfer2 = await basicToken.transfer(recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"), {from: sponsorAccounts[0].address})
			receiptTranfer2 = await receiptTranfer2.wait()
			console.log(`Gas used for ERC20 transfer - Transfer 2: ${receiptTranfer2.gasUsed}`)	
			let receiptTranfer3 = await basicToken.transfer(recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"), {from: sponsorAccounts[0].address})
			receiptTranfer3 = await receiptTranfer3.wait()
			console.log(`Gas used for ERC20 transfer - Transfer 3: ${receiptTranfer3.gasUsed}`)		
			let receiptApprove = await basicToken.approve(tokenAccounts[0].address, '115792089237316195423570985008687907853269984665640564039457584007913129639935', {from: sponsorAccounts[0].address})
			receiptApprove = await receiptApprove.wait()
			console.log(`Gas used for ERC20 approve: ${receiptApprove.gasUsed}`)

			const basicTokenFrom = basicToken.connect(tokenAccounts[0])
			let receiptTranferFrom = await basicTokenFrom.transferFrom(sponsorAccounts[0].address, recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"), {from: tokenAccounts[0].address})
			receiptTranferFrom = await receiptTranferFrom.wait()
			console.log(`Gas used for ERC20 tranferFrom - Transfer 1: ${receiptTranferFrom.gasUsed}`)
			let receiptTranferFrom2 = await basicTokenFrom.transferFrom(sponsorAccounts[0].address, recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"), {from: tokenAccounts[0].address})
			receiptTranferFrom2 = await receiptTranferFrom2.wait()
			console.log(`Gas used for ERC20 tranferFrom - Transfer 2: ${receiptTranferFrom2.gasUsed}`)
			let receiptTranferFrom3 = await basicTokenFrom.transferFrom(sponsorAccounts[0].address, recipientAccounts[0].address, ethers.utils.parseUnits("1", "ether"), {from: tokenAccounts[0].address})
			receiptTranferFrom3 = await receiptTranferFrom3.wait()
			console.log(`Gas used for ERC20 tranferFrom - Transfer 3: ${receiptTranferFrom3.gasUsed}`)	
		})
	})
})