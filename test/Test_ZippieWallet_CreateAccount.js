var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWallet.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const { 
	createBlankCheck_1of1Signer_1of1Card,
	createSetLimit_1of1Signer_1of1Card,
	buildCreate2Address
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

		it("should allow a blank check to be cashed once, and fail the second time", async () => {
			const bc1 = await createBlankCheck_1of1Signer_1of1Card(
				multisigAccounts[0],
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[0],
				signerAccounts[0],
				0,
				[1, 1, 1, 1],
				web3.utils.toWei("1", "ether"),
				0
			)
			
			const bytecode = accountBytecode + web3.eth.abi.encodeParameters(['address', 'address'], [basicToken.address, zippieWallet.address]).slice(2)
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
				
			multisigAccounts[0] = accountAddress
			console.log('multisigAccounts[0]')
			console.log(multisigAccounts[0])

			let balanceOfSender = await basicToken.balanceOf(multisigAccounts[0])
			let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
			assert(await zippieWallet.usedNonces(multisigAccounts[0], verificationKeys[0]) === false, "check already marked as cashed before transfer")
			
			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceBefore')
			console.log(allowanceBefore)

			// Redeem blank check and create account
			await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})

			balanceOfSender = await basicToken.balanceOf(multisigAccounts[0])
			balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
			assert(balanceOfSender.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
			assert(balanceOfRecipient.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
			assert(await zippieWallet.usedNonces(multisigAccounts[0], verificationKeys[0]) === true, "check has not been marked as cashed after transfer")

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
		});

		it("create zippie account and check allowance", async () => {
			console.log('basicToken')
			console.log(basicToken.address)

			console.log('zippieWallet')
			console.log(zippieWallet.address)

			const bytecode = accountBytecode + web3.eth.abi.encodeParameters(['address', 'address'], [basicToken.address, zippieWallet.address]).slice(2)
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
			await zippieWallet.createAccount(basicToken.address, salt, {from: sponsorAccounts[0]})

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceAfter')
			console.log(allowanceAfter)
		});		
	});
});