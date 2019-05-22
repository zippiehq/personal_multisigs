var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWalletERC20.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const { 
	createBlankCheck_1of1Signer_1of1Card,
	createBlankCheck_1of1Signer_NoCard,
} = require('./HelpFunctions');

// XXX Bytecode changes if contract is moved into a new folder (huh?)
//const { abi:accountAbi, bytecode:accountBytecode } = require('../build/contracts/ZippieAccountERC20.json')
const accountBytecode = '0x608060405234801561001057600080fd5b50600080546001600160a01b03191633179055610171806100326000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063daea85c514610030575b600080fd5b6100566004803603602081101561004657600080fd5b50356001600160a01b0316610058565b005b6000546001600160a01b0316331461006f57600080fd5b60408051600160e01b63095ea7b3028152336004820152600019602482015290516001600160a01b0383169163095ea7b39160448083019260209291908290030181600087803b1580156100c257600080fd5b505af11580156100d6573d6000803e3d6000fd5b505050506040513d60208110156100ec57600080fd5b50516101425760408051600160e51b62461bcd02815260206004820152600e60248201527f417070726f7665206661696c6564000000000000000000000000000000000000604482015290519081900360640190fd5b32fffea165627a7a7230582032c59f0247a959ee08569c8456e1b35a213a36088625adeb369ffa1a46228e3e0029'

contract("ZippieWallet (using CREATE2 to approve ERC20 transfers for accounts)", (accounts) => {

	var test;
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
		accounts[14]
	]

	// token recipient
	const recipientAccounts = [
		accounts[2]
	]

	beforeEach(() => {
		return TestFunctions.new().then(instance => {
			test = instance;
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

			// Calculate account address
			const bytecode = accountBytecode
			const bytecodeHash = web3.utils.sha3(bytecode)
			const salt = await test.soliditySha3_addresses_m(bc1.signers, bc1.m);
			const accountHash = web3.utils.sha3(`0x${'ff'}${zippieWallet.address.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
			const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()			

			// Send tokens to account
			await basicToken.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: tokenAccounts[0]});

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === false, "check already marked as cashed before transfer")
			
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceBefore.toString() === "0", "allowance set before approved")

			// Redeem blank check and create account
			const receipt = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0]: ${receipt.receipt.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === true, "check has not been marked as cashed after transfer")

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
			console.log(`Gas used for redeemBlankCheck w/o createAccount m[1,1,0,0]: ${receipt2.receipt.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("98", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("2", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === true, "check has not been marked as cashed after transfer")
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

			// Calculate account address
			const bytecode = accountBytecode
			const bytecodeHash = web3.utils.sha3(bytecode)
			const salt = await test.soliditySha3_addresses_m(bc1.signers, bc1.m);
			const accountHash = web3.utils.sha3(`0x${'ff'}${zippieWallet.address.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
			const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()

			// Send tokens to account
			await basicToken.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: tokenAccounts[0]});

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === false, "check already marked as cashed before transfer")
			
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceBefore.toString() === "0", "allowance set before approved")

			// Redeem blank check and create account
			const receipt = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,1,1]: ${receipt.receipt.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === true, "check has not been marked as cashed after transfer")

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
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === true, "check has not been marked as cashed after transfer")
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

			// Calculate account address
			const bytecode = accountBytecode
			const bytecodeHash = web3.utils.sha3(bytecode)
			const salt = await test.soliditySha3_addresses_m(bc1.signers, bc1.m);
			const accountHash = web3.utils.sha3(`0x${'ff'}${zippieWallet.address.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
			const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()			

			// Send token 1 to account
			await basicToken.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: tokenAccounts[0]});

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === false, "check already marked as cashed before transfer")
			
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceBefore.toString() === "0", "allowance set before approved")

			// Redeem blank check and approve token 1
			const receipt = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0] - Token 1: ${receipt.receipt.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === true, "check has not been marked as cashed after transfer")

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			assert(allowanceAfter > 0, "allowance not set")

			// Send token 2 to account
			await basicToken2.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: tokenAccounts[0]});

			let balanceOfSender2 = await basicToken2.balanceOf(accountAddress)
			let balanceOfRecipient2 = await basicToken2.balanceOf(recipientAccounts[0])
			assert(balanceOfSender2.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient2.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === false, "check already marked as cashed before transfer")
			
			const allowanceBefore2 = await basicToken2.allowance(accountAddress, zippieWallet.address)
			assert(allowanceBefore2.toString() === "0", "allowance set before approved")

			// Redeem blank check and approve token 2
			const receipt2 = await zippieWallet.redeemBlankCheck(bc2.addresses, bc2.signers, bc2.m, bc2.signatures.v, bc2.signatures.r, bc2.signatures.s, bc2.amount, bc2.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0] - Token 2: ${receipt2.receipt.gasUsed}`)

			balanceOfSender2 = await basicToken2.balanceOf(accountAddress)
			balanceOfRecipient2 = await basicToken2.balanceOf(recipientAccounts[0])
			assert(balanceOfSender2.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient2.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[1]) === true, "check has not been marked as cashed after transfer")

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

			// Calculate account address
			const bytecode = accountBytecode
			const bytecodeHash = web3.utils.sha3(bytecode)
			const salt = await test.soliditySha3_addresses_m(bc1.signers, bc1.m);
			const accountHash = web3.utils.sha3(`0x${'ff'}${zippieWallet.address.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
			const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()
			const accountAddressSolidity = await zippieWallet.getAccountAddress(salt, {from: sponsorAccounts[0]})
			assert(accountAddress === accountAddressSolidity.toLowerCase(), "account address calculation didn't match")

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
			console.log(`Gas used for ERC20 transfer: ${receiptTranfer.receipt.gasUsed}`)			
			const receiptApprove = await basicToken.approve(sponsorAccounts[0], '115792089237316195423570985008687907853269984665640564039457584007913129639935', {from: tokenAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 approve: ${receiptApprove.receipt.gasUsed}`)
			const receiptTranferFrom = await basicToken.transferFrom(tokenAccounts[0], recipientAccounts[0], web3.utils.toWei("1", "ether"), {from: sponsorAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 tranferFrom: ${receiptTranferFrom.receipt.gasUsed}`)	
		});
	});
});