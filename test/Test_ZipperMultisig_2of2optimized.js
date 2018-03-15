var BasicERC20 = artifacts.require("./BasicERC20.sol");
var ZipperMultisigWallet = artifacts.require("./ZipperMultisigWallet.sol");

contract("Test Zipper Multisig 2 of 2 optimized", (accounts) => {

	var basicToken;
	var zipperMS;

	beforeEach( () => {
    	return BasicERC20.new(accounts[9]).then( (instance) => {
    		basicToken = instance;
    		return ZipperMultisigWallet.new();
     	}).then( (instance) => {
     		zipperMS = instance;
     		return basicToken.approve(instance.address, web3.toWei(100, "ether"), {from: accounts[9]});
     	});
	});

	it("should allow 2 of 2 multisig transfer, and fail any duplicate transfer", async () => {

		// hash ([address], 1) in the EVM and then sign it with the temporary private key
		// according to the zipper multisig, this allows 'address' to transfer funds out of temp priv key
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[0], accounts[1]], 2);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);
		
		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;;
		
		var signByKeys = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(1, "ether"), accounts[0], 1);
		var signedByKey1 = web3.eth.sign(accounts[0], signByKeys).slice(2);
		
		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		var signedByKey2 = web3.eth.sign(accounts[1], signByKeys).slice(2);
		
		var r2 = '0x' + signedByKey2.slice(0,64);
		var s2 = '0x' + signedByKey2.slice(64,128);
		var v2 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

		await zipperMS.checkAndTransferFrom_2of2([accounts[9], basicToken.address], [accounts[0], accounts[1]], [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 1, accounts[0], web3.toWei(1, "ether"), {from: accounts[0]});

		assert((await basicToken.balanceOf(accounts[0])).toString() === web3.toWei(1, "ether"), "failed 2 of 2 multisig transfer!");

		try {
			// try the same exact transfer 
			await zipperMS.checkAndTransferFrom_2of2([accounts[9], basicToken.address], [accounts[0], accounts[1]], [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 1, accounts[0], web3.toWei(1, "ether"), {from: accounts[0]});
			assert(false, "duplicate transfer went through, but should have failed!")

		} catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}

		try {
			await zipperMS.checkAndTransferFrom_2of2([accounts[9], basicToken.address], [accounts[0], accounts[1]], [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 2, accounts[0], web3.toWei(1, "ether"), {from: accounts[0]});
			assert(false, "transfer with a fake nonce increment went through, but should have failed!");
		}
		catch (error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}

	});

	it("should fail when multisig wallet address doesn't ecrecover properly", async () => {

		// note that m here = 3, because we are trying to ecrecover the wrong address
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[0], accounts[1]], 3);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);
		
		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;;
		
		var signByKeys = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(1, "ether"), accounts[0], 1);
		var signedByKey1 = web3.eth.sign(accounts[0], signByKeys).slice(2);
		
		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		var signedByKey2 = web3.eth.sign(accounts[1], signByKeys).slice(2);
		
		var r2 = '0x' + signedByKey2.slice(0,64);
		var s2 = '0x' + signedByKey2.slice(64,128);
		var v2 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

		try {
			// try the same exact transfer 
			await zipperMS.checkAndTransferFrom_2of2([accounts[9], basicToken.address], [accounts[0], accounts[1]], [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 1, accounts[0], web3.toWei(1, "ether"), {from: accounts[0]});
			assert(false, "multisig address should have ec recovered incorrectly, and failed!")

		} catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}
	});

	it("should fail a 2/2 transfer when the same sig is used twice", async () => {

		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[0], accounts[1]], 2);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);
		
		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;;
		
		var signByKeys = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(1, "ether"), accounts[0], 1);
		var signedByKey1 = web3.eth.sign(accounts[0], signByKeys).slice(2);
		
		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		try{
			await zipperMS.checkAndTransferFrom_2of2([accounts[9], basicToken.address], [accounts[0], accounts[1]], [v0, v1, v1], [r0.valueOf(), r1.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf(), s1.valueOf()], 1, accounts[0], web3.toWei(1, "ether"), {from: accounts[0]});
			assert(false, "transfer with a duplicate signature went through, but should have failed!");
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}
	});
})