var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWalletERC20.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const { 
	createBlankCheck_1of1Signer_1of1Card,
	createBlankCheck_1of1Signer_NoCard,
	getAccountAddress,
	soliditySha3_addresses_m,
	ZERO_ADDRESS,
} = require('./HelpFunctions');

contract("ZippieWallet (using CREATE2 to approve ERC20 transfers for accounts)", (accounts) => {
	var basicToken;
	var basicToken2;
	var zippieCardNonces;
	var zippieWallet;

	// pay my gas server 
	const sponsorAccounts = [
		accounts[0],
		accounts[99]
	] 
	
	// token account
	const tokenAccounts = [
		accounts[5]
	]
	
	// signer (1of1)
	const signerAccounts = [
		accounts[0]
	]

	// random verification key
	const verificationKeys = [
		accounts[4], 
		accounts[14],
		accounts[15]
	]

	// token recipient
	const recipientAccounts = [
		accounts[2]
	]

	beforeEach(() => {
		return BasicERC20Mock.new(tokenAccounts[0]).then(instance => {
			basicToken = instance
			return BasicERC20Mock.new(tokenAccounts[0]).then(instance => {
				basicToken2 = instance
				return ZippieCardNonces.new().then(instance => {
					zippieCardNonces = instance
					return ZippieWallet.new(zippieCardNonces.address).then(instance => {
						zippieWallet = instance;
					});
				});
			});
		});
	});

	describe("test account creation with CREATE2", function() {		
		it("redeemBlankCheck m[1,1,0,0]", async () => {
			// Blank Check 1
			const bc1 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[0],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)
			
			// Blank Check 2
			const bc2 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0],
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
			await basicToken.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: tokenAccounts[0]});

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === ZERO_ADDRESS, "check already marked as cashed before transfer")
			
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceBefore.toString() === "0", "allowance set before approved")

			// Redeem blank check and create account
			const tx = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0]: ${tx.receipt.gasUsed}`)
			assert(tx.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
			}) === true, "missing Transfer event")
			assert(tx.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Approval(address,address,uint256)") 
				&& log.data === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' 
			}) === true, "missing Approval event")
			// https://github.com/OpenZeppelin/openzeppelin-contracts/pull/3085
			// assert(tx.receipt.rawLogs.some(log => { 
			// 	return log.topics[0] === web3.utils.sha3("Approval(address,address,uint256)") 
			// 	&& log.data !== '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' 
			// }) === true, "missing Approval event")


			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === recipientAccounts[0], "check has not been marked as cashed after transfer")

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceAfter > 0, "allowance not set")

			try {
				// try the same exact transfer
				await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
				assert(false, "duplicate transfer went through, but should have failed!")
			} catch(error) {
				assert(error.reason == 'Nonce already used', error.reason)
			}

			// Redeem second blank check (no create account, was done in previous call)
			const tx2 = await zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.amount, bc2.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/o createAccount m[1,1,0,0]: ${tx2.receipt.gasUsed}`)
			assert(tx2.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
			}) === true, "missing Transfer event")
			assert(tx2.receipt.rawLogs.some(log => {
				return log.topics[0] === web3.utils.sha3("Approval(address,address,uint256)") 
				&& log.data === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' 
			}) === false, "unexpected Approval event")
        	// https://github.com/OpenZeppelin/openzeppelin-contracts/pull/3085
			// assert(tx2.receipt.rawLogs.some(log => { 
			// 	return log.topics[0] === web3.utils.sha3("Approval(address,address,uint256)") 
			// 	&& log.data !== '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' 
			// }) === true, "missing Approval event")

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("98", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("2", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === recipientAccounts[0], "check has not been marked as cashed after transfer")

			// Redeem third blank check back to sender (i.e. cancel)
			const tx3 = await zippieWallet.redeemBlankCheck(bc3.addresses, bc3.signers, bc3.m, bc3.signatures.v, bc3.signatures.r, bc3.signatures.s, bc3.amount, bc3.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/o transfer (i.e. cacnel) m[1,1,0,0]: ${tx3.receipt.gasUsed}`)
			assert(tx3.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
			}) === false, "unexpected Transfer event")
			assert(tx3.receipt.rawLogs.some(log => {
				return log.topics[0] === web3.utils.sha3("Approval(address,address,uint256)") 
			}) === false, "unexpected Approval event")

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			assert(balanceOfSender.toString() === web3.utils.toWei("98", "ether"), "balance transfer from sender when it shouldn't");
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[2]) === accountAddress, "check has not been marked as cashed after transfer")
		});

		it("redeemBlankCheck m[1,1,1,1]", async () => {
			// Blank Check 1
			const bc1 = await createBlankCheck_1of1Signer_1of1Card(
				basicToken.address,
				recipientAccounts[0],
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
				recipientAccounts[0],
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
			await basicToken.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: tokenAccounts[0]});

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === ZERO_ADDRESS, "check already marked as cashed before transfer")
			
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceBefore.toString() === "0", "allowance set before approved")

			// Redeem blank check and create account
			const receipt = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,1,1]: ${receipt.receipt.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === recipientAccounts[0], "check has not been marked as cashed after transfer")

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceAfter > 0, "allowance not set")

			try {
				// try the same exact transfer
				await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
				assert(false, "duplicate transfer went through, but should have failed!")
			} catch(error) {
				assert(error.reason == 'Nonce already used', error.reason)
			}

			// Redeem second blank check (no create account, was done in previous call)
			const receipt2 = await zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.amount, bc2.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/o createAccount m[1,1,1,1]: ${receipt2.receipt.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("98", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("2", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === recipientAccounts[0], "check has not been marked as cashed after transfer")
		});
		it("redeemBlankCheck m[1,1,0,0] with 2 tokens (2 approve)", async () => {
			// Blank Check 1
			const bc1 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[0],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)
			
			// Blank Check 2
			const bc2 = await createBlankCheck_1of1Signer_NoCard(
				basicToken2.address,
				recipientAccounts[0],
				verificationKeys[1],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)

			// Get account address	
			const accountAddress = getAccountAddress(bc1.signers, bc1.m, zippieWallet.address)		

			// Send token 1 to account
			await basicToken.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: tokenAccounts[0]});

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === ZERO_ADDRESS, "check already marked as cashed before transfer")
			
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceBefore.toString() === "0", "allowance set before approved")

			// Redeem blank check and approve token 1
			const receipt = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0] - Token 1: ${receipt.receipt.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === recipientAccounts[0], "check has not been marked as cashed after transfer")

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceAfter > 0, "allowance not set")

			// Send token 2 to account
			await basicToken2.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: tokenAccounts[0]});

			let balanceOfSender2 = await basicToken2.balanceOf(accountAddress)
			let balanceOfRecipient2 = await basicToken2.balanceOf(recipientAccounts[0])
			assert(balanceOfSender2.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient2.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === ZERO_ADDRESS, "check already marked as cashed before transfer")
			
			const allowanceBefore2 = await basicToken2.allowance(accountAddress, zippieWallet.address)
			assert(allowanceBefore2.toString() === "0", "allowance set before approved")

			// Redeem blank check and approve token 2
			const receipt2 = await zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.amount, bc2.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0] - Token 2: ${receipt2.receipt.gasUsed}`)

			balanceOfSender2 = await basicToken2.balanceOf(accountAddress)
			balanceOfRecipient2 = await basicToken2.balanceOf(recipientAccounts[0])
			assert(balanceOfSender2.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient2.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === recipientAccounts[0], "check has not been marked as cashed after transfer")

			const allowanceAfter2 = await basicToken2.allowance(accountAddress, zippieWallet.address)
			assert(allowanceAfter2 > 0, "allowance not set")
		});
		it("send ether to account and kill contract with an approve to get the ether to the sponsor", async () => {
			// Blank Check 1
			const bc1 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[0],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)

			// Get account address	
			const accountAddress = getAccountAddress(bc1.signers, bc1.m, zippieWallet.address)
			const salt = soliditySha3_addresses_m(bc1.signers, bc1.m);
			const accountAddressSolidity = await zippieWallet.getAccountAddress(salt, {from: sponsorAccounts[0]})
			assert(accountAddress === accountAddressSolidity, "account address calculation didn't match")

			// Send tokens to account
			await basicToken.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: tokenAccounts[0]});

			// Send ETH to account
			const balanceBefore = await web3.eth.getBalance(accountAddress)
			assert(balanceBefore.toString() === "0", "incorrect account balance before")
			const receiptTranfer = await web3.eth.sendTransaction({from: sponsorAccounts[0], to: accountAddress, value: web3.utils.toWei("1", "ether")})
			console.log(`Gas used for ETH transfer: ${receiptTranfer.gasUsed}`)
			const balanceAfter = await await web3.eth.getBalance(accountAddress)
			assert(balanceAfter === web3.utils.toWei("1", "ether"), "incorrect account balance after")
			
			// Redeem blank check and create account (approve a token and check allowance)
			const sponsorBalanceBefore = await web3.eth.getBalance(sponsorAccounts[1])
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceBefore.toString() === "0", "allowance set before approved")
			const receiptRedeemBlankCheck = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[1], gasPrice: "1"})
			const gasUsed = receiptRedeemBlankCheck.receipt.gasUsed
			console.log(`Gas used for redeemBlankCheck: ${gasUsed}`)
			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceAfter > 0, "allowance not set")
						
			// Check if ETH was transfered correctly to sponsor after selfdestruct(tx.origin)
			const accountBalanceAfterSelfdestruct = await await web3.eth.getBalance(accountAddress)
			assert(accountBalanceAfterSelfdestruct === "0", "incorrect account balance after selfdestruct")
			const sponsorBalanceAfter = await web3.eth.getBalance(sponsorAccounts[1])
			assert(web3.utils.toWei("1", "ether") === web3.utils.toBN(sponsorBalanceAfter).sub(web3.utils.toBN(sponsorBalanceBefore)).add(web3.utils.toBN(gasUsed)).toString(), "incorrect sponsor balance after seldfedstruct")
		});	
		it("gas used for normal ERC20 transfer and approve + transferFrom", async () => {
			const receiptTranfer = await basicToken.transfer(recipientAccounts[0], web3.utils.toWei("1", "ether"), {from: tokenAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 transfer - Transfer 1: ${receiptTranfer.receipt.gasUsed}`)		
			const receiptTranfer2 = await basicToken.transfer(recipientAccounts[0], web3.utils.toWei("1", "ether"), {from: tokenAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 transfer - Transfer 2: ${receiptTranfer2.receipt.gasUsed}`)	
			const receiptTranfer3 = await basicToken.transfer(recipientAccounts[0], web3.utils.toWei("1", "ether"), {from: tokenAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 transfer - Transfer 3: ${receiptTranfer3.receipt.gasUsed}`)		
			const receiptApprove = await basicToken.approve(sponsorAccounts[0], '115792089237316195423570985008687907853269984665640564039457584007913129639935', {from: tokenAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 approve: ${receiptApprove.receipt.gasUsed}`)
			const receiptTranferFrom = await basicToken.transferFrom(tokenAccounts[0], recipientAccounts[0], web3.utils.toWei("1", "ether"), {from: sponsorAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 tranferFrom - Transfer 1: ${receiptTranferFrom.receipt.gasUsed}`)
			const receiptTranferFrom2 = await basicToken.transferFrom(tokenAccounts[0], recipientAccounts[0], web3.utils.toWei("1", "ether"), {from: sponsorAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 tranferFrom - Transfer 2: ${receiptTranferFrom2.receipt.gasUsed}`)
			const receiptTranferFrom3 = await basicToken.transferFrom(tokenAccounts[0], recipientAccounts[0], web3.utils.toWei("1", "ether"), {from: sponsorAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 tranferFrom - Transfer 3: ${receiptTranferFrom3.receipt.gasUsed}`)	
		});
	});
});