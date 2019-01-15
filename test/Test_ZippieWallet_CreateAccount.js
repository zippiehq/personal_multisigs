var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWallet.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const { 
	createBlankCheck,
	createSetLimit_1of1Signer_1of1Card,
	buildCreate2Address
} = require('./HelpFunctions');

const { abi:accountAbi, bytecode:accountBytecode } = require('../build/contracts/ZippieAccount.json')

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
						return basicToken.approve(zippieWallet.address, web3.utils.toWei("100", "ether"), {from: multisigAccounts[0]});
					});
				});
			});
		});
	});

	describe("test create2", function() {

		it("create zippie account and check allowance", async () => {

			console.log('basicToken')
			console.log(basicToken.address)
			console.log('zippieWallet')
			console.log(zippieWallet.address)

			const bytecode = accountBytecode + web3.eth.abi.encodeParameters(['address', 'address'], [basicToken.address, zippieWallet.address]).slice(2)
			//console.log('bytecode')
			//console.log(bytecode)

			// Use multisig account address as salt
			const salt = web3.utils.padLeft(multisigAccounts[0], 64)
			console.log('salt')
			console.log(salt)

			// Calculate AccountAddress 
			const accountAddress = `0x${web3.utils.sha3(`0x${'ff'}${zippieWallet.address.slice(2)}${salt.slice(2)}${web3.utils.sha3(bytecode).slice(2)}`).slice(-40)}`.toLowerCase()
			console.log('accountAddress')
			console.log(accountAddress)

			const allowanceBefore = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceBefore')
			console.log(allowanceBefore)
			
			const { logs } = await zippieWallet.createAccount(bytecode, salt, {from: sponsorAccounts[0]})
			console.log('logs')
			console.log(logs)

			const allowanceAfter = await basicToken.allowance(accountAddress, zippieWallet.address)
			console.log('allowanceAfter')
			console.log(allowanceAfter)
		});		
	});
});