var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWallet.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const { 
	createBlankCheck_1of1Signer_1of1Card,
	createBlankCheck_1of1Signer_NoCard,
} = require('./HelpFunctions');

const { abi:accountAbi, bytecode:accountBytecode } = require('../build/contracts/ZippieAccountERC20.json')

contract("ZippieWallet", (accounts) => {

	var test;
	var basicToken;
	var zippieCardNonces;
	var zippieWallet;
	const haveCards = true

	// pay my gas server 
	const sponsorAccounts = [
		accounts[0]
	] 
	
	// multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
	const multisigAccounts = [
		accounts[5]
	]
	
	// signer (1of1)
	const signerAccounts = [
		accounts[0]
	]

	// card (2FA)
	//var card = accounts[3]

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
			return BasicERC20Mock.new(multisigAccounts[0]).then(instance => {
				basicToken = instance
				return ZippieCardNonces.new().then(instance => {
					zippieCardNonces = instance
					return ZippieWallet.new(zippieCardNonces.address).then(instance => {
						zippieWallet = instance;
						//return basicToken.approve(zippieWallet.address, web3.utils.toWei("100", "ether"), {from: multisigAccounts[0]});
					});
				});
			});
		});
	});

	describe("test create2", function() {
		it("Gase used 1) transfer, 2) approve + transferFrom", async () => {
			const receiptTranfer =await basicToken.transfer(recipientAccounts[0], web3.utils.toWei("1", "ether"), {from: multisigAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 tranfer: ${receiptTranfer.receipt.gasUsed}`)			
			const receiptApprove = await basicToken.approve(sponsorAccounts[0], '115792089237316195423570985008687907853269984665640564039457584007913129639935', {from: multisigAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 approve: ${receiptApprove.receipt.gasUsed}`)
			const allowance = await basicToken.allowance(multisigAccounts[0], sponsorAccounts[0])
			console.log('allowance')
			console.log(allowance)
			const receiptTranferFrom = await basicToken.transferFrom(multisigAccounts[0], recipientAccounts[0], web3.utils.toWei("1", "ether"), {from: sponsorAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 tranferFrom: ${receiptTranferFrom.receipt.gasUsed}`)	
			const receiptApprove2 = await basicToken.approve(sponsorAccounts[0], '115792089237316195423570985008687907853269984665640564039457584007913129639935', {from: multisigAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 approve: ${receiptApprove2.receipt.gasUsed}`)
			const receiptTranferFrom2 = await basicToken.transferFrom(multisigAccounts[0], recipientAccounts[0], web3.utils.toWei("1", "ether"), {from: sponsorAccounts[0], gasPrice: 1});
			console.log(`Gas used for ERC20 tranferFrom: ${receiptTranferFrom2.receipt.gasUsed}`)	
		});			
		it("redeemBlankCheck m[1,1,0,0]", async () => {
			const bc1 = await createBlankCheck_1of1Signer_NoCard(
				multisigAccounts[0],
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[0],
				signerAccounts[0],
				[1, 1, 0, 0],
				web3.utils.toWei("1", "ether"),
			)
			
			const bc2 = await createBlankCheck_1of1Signer_NoCard(
				multisigAccounts[0],
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[1],
				signerAccounts[0],
				[1, 1, 0, 0],
				web3.utils.toWei("1", "ether"),
			)

			const bytecode = accountBytecode + web3.eth.abi.encodeParameters(['address'], [basicToken.address]).slice(2)
			const bytecodeHash = web3.utils.sha3(bytecode)
			const salt = await test.soliditySha3_addresses_m(bc1.signers, bc1.m);
			//const salt = web3.utils.sha3(web3.eth.abi.encodeParameters(['address[]', 'uint8[]'], [bc1.signers, bc1.m]))
			const accountHash = web3.utils.sha3(`0x${'ff'}${zippieWallet.address.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
			const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()
			console.log('accountAddress')
			console.log(accountAddress)
			
			const accountAddress2 = await zippieWallet.getAccountAddress(basicToken.address, salt, {from: sponsorAccounts[0]})
			console.log('accountAddress2')
			console.log(accountAddress2.toLowerCase())	

			await basicToken.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: multisigAccounts[0]});

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === false, "check already marked as cashed before transfer")
			
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceBefore')
			console.log(allowanceBefore)

			// Redeem blank check and create account
			const receipt = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,0,0]: ${receipt.receipt.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === true, "check has not been marked as cashed after transfer")

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceAfter')
			console.log(allowanceAfter)

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
			
			const allowanceAfter2 = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceAfter2')
			console.log(allowanceAfter2)

		});

		it("redeemBlankCheck m[1,1,1,1]", async () => {
			const bc1 = await createBlankCheck_1of1Signer_1of1Card(
				multisigAccounts[0],
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[0],
				signerAccounts[0],
				1,
				[1, 1, 1, 1],
				web3.utils.toWei("1", "ether"),
				0
			)
			
			const bc2 = await createBlankCheck_1of1Signer_1of1Card(
				multisigAccounts[0],
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[1],
				signerAccounts[0],
				1,
				[1, 1, 1, 1],
				web3.utils.toWei("1", "ether"),
				1
			)

			const bytecode = accountBytecode + web3.eth.abi.encodeParameters(['address'], [basicToken.address]).slice(2)
			const bytecodeHash = web3.utils.sha3(bytecode)
			const salt = await test.soliditySha3_addresses_m(bc1.signers, bc1.m);
			//const salt = web3.utils.sha3(web3.eth.abi.encodeParameters(['address[]', 'uint8[]'], [bc1.signers, bc1.m]))
			const accountHash = web3.utils.sha3(`0x${'ff'}${zippieWallet.address.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
			const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()
			console.log('accountAddress')
			console.log(accountAddress)
			
			const accountAddress2 = await zippieWallet.getAccountAddress(basicToken.address, salt, {from: sponsorAccounts[0]})
			console.log('accountAddress2')
			console.log(accountAddress2.toLowerCase())	

			await basicToken.transfer(accountAddress, web3.utils.toWei("100", "ether"), {from: multisigAccounts[0]});

			let balanceOfSender = await basicToken.balanceOf(accountAddress)
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === false, "check already marked as cashed before transfer")
			
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceBefore')
			console.log(allowanceBefore)

			// Redeem blank check and create account
			const receipt = await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
			console.log(`Gas used for redeemBlankCheck w/ createAccount m[1,1,1,1]: ${receipt.receipt.gasUsed}`)

			balanceOfSender = await basicToken.balanceOf(accountAddress)
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(accountAddress, verificationKeys[0]) === true, "check has not been marked as cashed after transfer")

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceAfter')
			console.log(allowanceAfter)

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
			
			const allowanceAfter2 = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceAfter2')
			console.log(allowanceAfter2)

		});

		it("create zippie account and check allowance", async () => {
			console.log('basicToken')
			console.log(basicToken.address)

			console.log('zippieWallet')
			console.log(zippieWallet.address)

			const bytecode = accountBytecode + web3.eth.abi.encodeParameters(['address'], [basicToken.address]).slice(2)
			//console.log('bytecode')
			//console.log(bytecode)

			const bytecodeHash = web3.utils.sha3(bytecode)
			console.log('bytecodeHash')
			console.log(bytecodeHash)

			const salt = web3.utils.sha3(web3.eth.abi.encodeParameters(['address[]', 'uint256[]'], [[signerAccounts[0]], [1, 1, 0, 0]]))
			console.log('salt')
			console.log(salt)

			// Calculate AccountAddress 
			const accountHash = web3.utils.sha3(`0x${'ff'}${zippieWallet.address.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
			console.log('accountHash')
			console.log(accountHash)

			const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()
			console.log('accountAddress')
			console.log(accountAddress)

			const accountAddress2 = await zippieWallet.getAccountAddress(basicToken.address, salt, {from: sponsorAccounts[0]})
			console.log('accountAddress2')
			console.log(accountAddress2.toLowerCase())	

			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceBefore')
			console.log(allowanceBefore)
			
			// Create account
			const receipt = await zippieWallet.createAccount(basicToken.address, salt, {from: sponsorAccounts[0]})
			console.log(`Gas used for createAccount: ${receipt.receipt.gasUsed}`)

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceAfter')
			console.log(allowanceAfter)
		});		
	});
});