var BasicERC721Mock = artifacts.require("./BasicERC721Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWalletERC721.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const { 
	createBlankCheck_1of1Signer_1of1Card,
	createBlankCheck_1of1Signer_NoCard,
	getAccountAddress,
	soliditySha3_addresses_m,
	ZERO_ADDRESS,
} = require('./HelpFunctions');


contract("ZippieWalletERC721 (using CREATE2 to approve ERC721 transfers for accounts)", (accounts) => {
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
		return BasicERC721Mock.new(tokenAccounts[0]).then(instance => {
			basicToken = instance
			return BasicERC721Mock.new(tokenAccounts[0]).then(instance => {
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
			// Blank Check 1 (tokenId 1)
			const bc1 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[0],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)
			
			// Blank Check 2 (tokenId 2)
			const bc2 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0],
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

			// Send tokens to sender account
			await basicToken.transferFrom(tokenAccounts[0], accountAddress, "1", {from: tokenAccounts[0]});

			// Check token owner and operator approval before redeem
			const ownerOfToken1Before = await basicToken.ownerOf("1")
			assert(ownerOfToken1Before === accountAddress, "initial owner of token 1 is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === ZERO_ADDRESS, "check already marked as cashed before transfer")
			const approvalBefore = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			assert(approvalBefore === false, "operator approval set before redeem")

			// Redeem blank check and create account
			const tx = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0]: ${tx.receipt.gasUsed}`)
			assert(tx.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
			}) === true, "missing Transfer event")
			assert(tx.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("ApprovalForAll(address,address,bool)") 
				&& log.data === '0x0000000000000000000000000000000000000000000000000000000000000001' 
			}) === true, "missing Approval event")

			// Check owner and operator approval after redeem
			const ownerOfToken1After = await basicToken.ownerOf("1")
			assert(ownerOfToken1After === recipientAccounts[0], "token 1 owner after redeem is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === recipientAccounts[0], "check has not been marked as cashed after transfer")
			const approvalAfter = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			assert(approvalAfter === true, "operator approval not set after redeem")

			try {
				// try the same exact transfer
				await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[0]})
				assert(false, "duplicate transfer went through, but should have failed!")
			} catch(error) {
				assert(error.reason == 'Nonce already used', error.reason)
			}

			// BC2

			// Send tokens to sender account
			await basicToken.transferFrom(tokenAccounts[0], accountAddress, "2", {from: tokenAccounts[0]});

			// Check token owner before redeem
			const ownerOfToken2Before = await basicToken.ownerOf("2")
			assert(ownerOfToken2Before === accountAddress, "initial owner of token 2 is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === ZERO_ADDRESS, "check already marked as cashed before transfer")

			// Redeem second blank check (no create account, was done in previous call)
			const tx2 = await zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.tokenId, bc2.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/o createAccount m[1,1,0,0]: ${tx2.receipt.gasUsed}`)
			assert(tx2.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
			}) === true, "missing Transfer event")
			assert(tx2.receipt.rawLogs.some(log => {
				return log.topics[0] === web3.utils.sha3("ApprovalForAll(address,address,bool)") 
			}) === false, "unexpected Approval event")

			// Check owner after redeem
			const ownerOfToken2After = await basicToken.ownerOf("2")
			assert(ownerOfToken2After === recipientAccounts[0], "token 2 owner after redeem is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === recipientAccounts[0], "check has not been marked as cashed after transfer")
	
			// BC3

			// Send tokens to sender account
			await basicToken.transferFrom(tokenAccounts[0], accountAddress, "3", {from: tokenAccounts[0]});

			// Check token owner before redeem
			const ownerOfToken3Before = await basicToken.ownerOf("3")
			assert(ownerOfToken3Before === accountAddress, "initial owner of token 3 is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[2]) === ZERO_ADDRESS, "check already marked as cashed before transfer")

			// Redeem second blank check (no create account, was done in previous call)
			const tx3 = await zippieWallet.redeemBlankCheck(bc3.addresses, bc3.signers, bc3.m, bc3.signatures.v, bc3.signatures.r, bc3.signatures.s, bc3.tokenId, bc3.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/o transfer (i.e. cancel) m[1,1,0,0]: ${tx3.receipt.gasUsed}`)
			assert(tx3.receipt.rawLogs.some(log => { 
				return log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)") 
			}) === false, "unexpected Transfer event")
			assert(tx3.receipt.rawLogs.some(log => {
				return log.topics[0] === web3.utils.sha3("ApprovalForAll(address,address,bool)") 
			}) === false, "unexpected Approval event")

			// Check owner after redeem
			const ownerOfToken3After = await basicToken.ownerOf("3")
			assert(ownerOfToken3After === accountAddress, "token 3 owner after redeem is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === recipientAccounts[0], "check has not been marked as cashed after transfer")
		});

		it("redeemBlankCheck m[1,1,1,1]", async () => {
			// Blank Check 1 (tokenId 1)
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
			
			// Blank Check 2 (tokenId 2)
			const bc2 = await createBlankCheck_1of1Signer_1of1Card(
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[1],
				signerAccounts[0],
				1,
				[1, 1, 1, 1],
				"2",
				1
			)

			// Get account address	
			const accountAddress = getAccountAddress(bc1.signers, bc1.m, zippieWallet.address)

			// Send tokens to sender account
			await basicToken.transferFrom(tokenAccounts[0], accountAddress, "1", {from: tokenAccounts[0]});

			// Check token owner and operator approval before redeem
			const ownerOfToken1Before = await basicToken.ownerOf("1")
			assert(ownerOfToken1Before === accountAddress, "initial owner of token 1 is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === ZERO_ADDRESS, "check already marked as cashed before transfer")
			const approvalBefore = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			assert(approvalBefore === false, "operator approval set before redeem")

			// Redeem blank check and create account
			const receipt = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,1,1]: ${receipt.receipt.gasUsed}`)

			// Check owner and operator approval after redeem
			const ownerOfToken1After = await basicToken.ownerOf("1")
			assert(ownerOfToken1After === recipientAccounts[0], "token 1 owner after redeem is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === recipientAccounts[0], "check has not been marked as cashed after transfer")
			const approvalAfter = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			assert(approvalAfter === true, "operator approval not set after redeem")

			try {
				// try the same exact transfer
				await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[0]})
				assert(false, "duplicate transfer went through, but should have failed!")
			} catch(error) {
				assert(error.reason == 'Nonce already used', error.reason)
			}

			// Send tokens to sender account
			await basicToken.transferFrom(tokenAccounts[0], accountAddress, "2", {from: tokenAccounts[0]});

			// Check token owner before redeem
			const ownerOfToken2Before = await basicToken.ownerOf("2")
			assert(ownerOfToken2Before === accountAddress, "initial owner of token 2 is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === ZERO_ADDRESS, "check already marked as cashed before transfer")

			// Redeem second blank check (no create account, was done in previous call)
			const receipt2 = await zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.tokenId, bc2.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/o createAccount m[1,1,1,1]: ${receipt2.receipt.gasUsed}`)

			// Check owner after redeem
			const ownerOfToken2After = await basicToken.ownerOf("2")
			assert(ownerOfToken2After === recipientAccounts[0], "token 2 owner after redeem is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === recipientAccounts[0], "check has not been marked as cashed after transfer")
		});
		it("redeemBlankCheck m[1,1,0,0] with 2 tokens (2 approve)", async () => {
			// Blank Check 1 (token 1, tokenId 1)
			const bc1 = await createBlankCheck_1of1Signer_NoCard(
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[0],
				signerAccounts[0],
				[1, 1, 0, 0],
				"1",
			)
			
			// Blank Check 2 (token 2, tokenId 1)
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

			// Send token 1 to sender account
			await basicToken.transferFrom(tokenAccounts[0], accountAddress, "1", {from: tokenAccounts[0]});

			// Check token owner and operator approval before redeem
			const ownerOfToken1Before = await basicToken.ownerOf("1")
			assert(ownerOfToken1Before === accountAddress, "initial owner of token 1 is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === ZERO_ADDRESS, "check already marked as cashed before transfer")
			const approvalBefore = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			assert(approvalBefore === false, "operator approval set before redeem")

			// Redeem blank check and approve token 1
			const receipt = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0] - Token 1: ${receipt.receipt.gasUsed}`)

			// Check owner and operator approval after redeem
			const ownerOfToken1After = await basicToken.ownerOf("1")
			assert(ownerOfToken1After === recipientAccounts[0], "token 1 owner after redeem is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === recipientAccounts[0], "check has not been marked as cashed after transfer")
			const approvalAfter = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			assert(approvalAfter === true, "operator approval not set after redeem")

			// Send token 2 to sender account
			await basicToken2.transferFrom(tokenAccounts[0], accountAddress, "1", {from: tokenAccounts[0]});

			// Check token owner and operator approval before redeem
			const ownerOfToken2Before = await basicToken2.ownerOf("1")
			assert(ownerOfToken2Before === accountAddress, "initial owner of token 1 is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === ZERO_ADDRESS, "check already marked as cashed before transfer")
			const approvalBefore2 = await basicToken2.isApprovedForAll(accountAddress, zippieWallet.address)
			assert(approvalBefore2 === false, "operator approval set before redeem")

			// Redeem blank check and approve token 1
			const receipt2 = await zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.tokenId, bc2.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0] - Token 2: ${receipt2.receipt.gasUsed}`)

			// Check owner and operator approval after redeem
			const ownerOfToken2After = await basicToken2.ownerOf("1")
			assert(ownerOfToken2After === recipientAccounts[0], "token 1 owner after redeem is incorrect")
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === recipientAccounts[0], "check has not been marked as cashed after transfer")
			const approvalAfter2 = await basicToken2.isApprovedForAll(accountAddress, zippieWallet.address)
			assert(approvalAfter2 === true, "operator approval not set after redeem")
		});
		it("send ether to account and kill contract with an approve to get the ether to the sponsor", async () => {
			// Blank Check 1 (tokenId 1)
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

			// Send token 1 to sender account
			await basicToken.transferFrom(tokenAccounts[0], accountAddress, "1", {from: tokenAccounts[0]});

			// Send ETH to account
			const balanceBefore = await web3.eth.getBalance(accountAddress)
			assert(balanceBefore.toString() === "0", "incorrect account balance before")
			const receiptTranfer = await web3.eth.sendTransaction({from: sponsorAccounts[0], to: accountAddress, value: web3.utils.toWei("1", "ether")})
			console.log(`Gas used for ETH transfer: ${receiptTranfer.gasUsed}`)
			const balanceAfter = await await web3.eth.getBalance(accountAddress)
			assert(balanceAfter === web3.utils.toWei("1", "ether"), "incorrect account balance after")
			
			// Redeem blank check and create account (approve a token and check allowance)
			const sponsorBalanceBefore = await web3.eth.getBalance(sponsorAccounts[1])
			const approvalBefore = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			assert(approvalBefore === false, "operator approval set before redeem")
			const receiptRedeemBlankCheck = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.tokenId, bc1.cardNonces, {from: sponsorAccounts[1], gasPrice: "1"})
			const gasUsed = receiptRedeemBlankCheck.receipt.gasUsed
			console.log(`Gas used for redeemBlankCheck: ${gasUsed}`)
			const approvalAfter = await basicToken.isApprovedForAll(accountAddress, zippieWallet.address)
			assert(approvalAfter === true, "operator approval not set after redeem")
						
			// Check if ETH was transfered correctly to sponsor after selfdestruct(tx.origin)
			const accountBalanceAfterSelfdestruct = await await web3.eth.getBalance(accountAddress)
			assert(accountBalanceAfterSelfdestruct === "0", "incorrect account balance after selfdestruct")
			const sponsorBalanceAfter = await web3.eth.getBalance(sponsorAccounts[1])
			assert(web3.utils.toWei("1", "ether") === web3.utils.toBN(sponsorBalanceAfter).sub(web3.utils.toBN(sponsorBalanceBefore)).add(web3.utils.toBN(gasUsed)).toString(), "incorrect sponsor balance after seldfedstruct")
		});	
		it("gas used for normal ERC721 transfer and setApprovalForAll + transferFrom", async () => {
			const receiptTranferFromOwner = await basicToken.transferFrom(tokenAccounts[0], recipientAccounts[0], "1", {from: tokenAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC721 transferFrom (owner) - Transfer 1: ${receiptTranferFromOwner.receipt.gasUsed}`)		
			const receiptTranferFromOwner2 = await basicToken.transferFrom(tokenAccounts[0], recipientAccounts[0], "2", {from: tokenAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC721 transferFrom (owner) - Transfer 2: ${receiptTranferFromOwner2.receipt.gasUsed}`)	
			const receiptTranferFromOwner3 = await basicToken.transferFrom(tokenAccounts[0], recipientAccounts[0], "3", {from: tokenAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC721 transferFrom (owner) - Transfer 3: ${receiptTranferFromOwner3.receipt.gasUsed}`)		
			const receiptApproveForAll = await basicToken.setApprovalForAll(sponsorAccounts[0], true, {from: tokenAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC721 setApprovalForAll: ${receiptApproveForAll.receipt.gasUsed}`)
			const receiptTranferFromOperator = await basicToken.transferFrom(tokenAccounts[0], recipientAccounts[0], "4", {from: sponsorAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC721 tranferFrom (operator) - Transfer 1: ${receiptTranferFromOperator.receipt.gasUsed}`)	
			const receiptTranferFromOperator2 = await basicToken.transferFrom(tokenAccounts[0], recipientAccounts[0], "5", {from: sponsorAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC721 tranferFrom (operator) - Transfer 2: ${receiptTranferFromOperator2.receipt.gasUsed}`)	
			const receiptTranferFromOperator3 = await basicToken.transferFrom(tokenAccounts[0], recipientAccounts[0], "6", {from: sponsorAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC721 tranferFrom (operator) - Transfer 3: ${receiptTranferFromOperator3.receipt.gasUsed}`)	
		});
	});
});