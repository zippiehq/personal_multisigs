var BasicERC20 = artifacts.require("./BasicERC20.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");

contract("Test Zippie Multisig", (accounts) => {
	// accounts[9] is the "temporary private key"

	var basicToken;
	var zipperMS;

	before( () => {
    	return BasicERC20.new(accounts[9]).then( (instance) => {
    		basicToken = instance;
    		return ZippieMultisigWallet.new();
     	}).then( (instance) => {
     		zipperMS = instance;
     		return basicToken.approve(instance.address, web3.toWei(100, "ether"), {from: accounts[9]});
     	});
	});

	it("should deploy zipper multisig, and basic ERC20 test contract, and fund accounts[9] and approve the zipper multisig for full balance", async () => {
		// make sure that initial balances are set, and the zipper contract is approved 
		assert((await basicToken.balanceOf(accounts[9])).toString() === web3.toWei(100, "ether"), "balance of temp priv key != initial balance");
		assert((await basicToken.allowance(accounts[9], zipperMS.address)).toString() === web3.toWei(100, "ether"), "temp priv key has not approved Zippie Multisig for withdrawals");
	});

	it("should allow 1 of 1 multisig transfer, and fail any duplicate transfer", async () => {
		// hash ([address], 1) in the EVM and then sign it with the temporary private key
		// according to the zipper multisig, this allows 'address' to transfer funds out of temp priv key
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[0]], 1);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);
		
		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;;
		
		var signByKey1 = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(1, "ether"), accounts[0], 1);
		var signedByKey1 = web3.eth.sign(accounts[0], signByKey1).slice(2);
		
		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		console.log('multisig address is', accounts[9]);
		console.log('owner address is', accounts[0]);


		//checkAndTransferFrom(address multiSigWallet, address[] allSignersPossible, uint8 m, uint8[] v, bytes32[] r, bytes32[] s, uint256 nonce, address recipient, uint256 amount) public {

		await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[0]], 1, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 1, accounts[0], web3.toWei(1, "ether"), {from: accounts[0]});

		assert((await basicToken.balanceOf(accounts[0])).toString() === web3.toWei(1, "ether"), "failed 1 of 1 multisig transfer!");

		try {
			// try the same exact transfer 
			await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[0]], 1, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 1, accounts[0], web3.toWei(1, "ether"), {from: accounts[0]});
			assert(false, "duplicate transfer went through, but should have failed!")

		} catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}

		try {
			await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[0]], 1, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 2, accounts[0], web3.toWei(1, "ether"), {from: accounts[0]});
			assert(false, "transfer with a fake nonce increment went through, but should have failed!");
		}
		catch (error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}
	});

	it("should allow 2 of 2 multisig transfer", async () => {
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[1], accounts[2]], 2);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;;

		// sign this hash with both multisig keys
		// note that the nonce is incremented here
		var signByKeys = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(0.5, "ether"), accounts[1], 2);

		var signedByKey1 = web3.eth.sign(accounts[1], signByKeys).slice(2);
		
		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		var signedByKey2 = web3.eth.sign(accounts[2], signByKeys).slice(2);

		var r2 = '0x' + signedByKey2.slice(0,64);
		var s2 = '0x' + signedByKey2.slice(64,128);
		var v2 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

		// check and transfer with a 2 of 2 with nonce == 2
		await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1], accounts[2]], 2, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 2, accounts[1], web3.toWei(0.5, "ether"), {from: accounts[0]});

		assert((await basicToken.balanceOf(accounts[1])).toString() === web3.toWei(0.5, "ether"), "failed 2 of 2 multisig transfer!");
	});

	it("should fail 2 of 2 multisig transfer, when amount is not agreed upon", async () => {
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[1], accounts[2]], 2);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// sign this hash with the first multisig key
		// note that the nonce is incremented here
		var signByKey1 = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(0.5, "ether"), accounts[2], 3);
		var signedByKey1 = web3.eth.sign(accounts[1], signByKey1).slice(2);
		
		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		// sign this hash with the second multisig key, note that the amounts are different
		// note that the nonce is incremented here
		var signByKey2 = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(0.51, "ether"), accounts[2], 3);
		var signedByKey2 = web3.eth.sign(accounts[2], signByKey2).slice(2);
		
		var r2 = '0x' + signedByKey2.slice(0,64);
		var s2 = '0x' + signedByKey2.slice(64,128);
		var v2 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

		try {
			// check and transfer with a 2 of 2 with nonce == 2, where the value being transfered is agreed by #1, but not #2
			await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1], accounts[2]], 2, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 3, accounts[2], web3.toWei(0.5, "ether"), {from: accounts[0]});
			assert(false, "transfer should have failed! amount was not agreed by #1");
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")		
		}

		try {
			// check and transfer with a 2 of 2 with nonce == 2, where the value being transfered is agreed by #2 this time, but not #1
			await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1], accounts[2]], 2, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 3, accounts[2], web3.toWei(0.51, "ether"), {from: accounts[0]});
			assert(false, "transfer should have failed! amount was not agreed by #2");
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")		
		}

		try {
			// check and transfer with a 2 of 2 with nonce == 2, where the value being transfered is not agreed by #1, #2, or msg.sender
			await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1], accounts[2]], 2, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 3, accounts[2], web3.toWei(0.52, "ether"), {from: accounts[0]});
			assert(false, "transfer should have failed! amount was not agreed by any person!");
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")		
		}

		// now do a test where the amounts are agreed by 1 and 2, but the amount submitted to be sent is different
		// overwrite all these variables...
		signedByKey2 = web3.eth.sign(accounts[2], signByKey1).slice(2);

		r2 = '0x' + signedByKey2.slice(0,64);
		s2 = '0x' + signedByKey2.slice(64,128);
		v2 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

		try {
			// check and transfer with a 2 of 2 with nonce == 2, where the value being transfered is agreed by #1 and #2, but not msg.sender
			await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1], accounts[2]], 2, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 3, accounts[2], web3.toWei(0.51, "ether"), {from: accounts[0]});
			assert(false, "transfer should have failed! amount was not agreed by transaction sender, but was agreed by #1 & #2");
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}
	});

	it("should pass all three (correct) variants of 2 of 3 multisig transfer", async () => {
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[1], accounts[2], accounts[3]], 2);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// ROUND 1: KEYS 1 & 2

		// sign this hash with the first and second key
		// note that the nonce is 3
		var signByKeys = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(0.75, "ether"), accounts[2], 3);
		var signedByKey1 = web3.eth.sign(accounts[1], signByKeys).slice(2);
		var signedByKey2 = web3.eth.sign(accounts[2], signByKeys).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		var r2 = '0x' + signedByKey2.slice(0,64);
		var s2 = '0x' + signedByKey2.slice(64,128);
		var v2 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

		await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1], accounts[2], accounts[3]], 2, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 3, accounts[2], web3.toWei(0.75, "ether"), {from: accounts[0]});
		assert((await basicToken.balanceOf(accounts[2])).toString() === web3.toWei(0.75, "ether"), "failed 2 of 3 (rd. 1/3) multisig transfer!");

		// ROUND 2: KEYS 1 & 3

		// sign this hash with the first and third key
		// note that the nonce is 4
		var signByKeys = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(0.75, "ether"), accounts[2], 4);
		var signedByKey1 = web3.eth.sign(accounts[1], signByKeys).slice(2);
		var signedByKey3 = web3.eth.sign(accounts[3], signByKeys).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		var r2 = '0x' + signedByKey3.slice(0,64);
		var s2 = '0x' + signedByKey3.slice(64,128);
		var v2 = web3.toDecimal(signedByKey3.slice(128,130)) + 27;

		await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1], accounts[2], accounts[3]], 2, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 4, accounts[2], web3.toWei(0.75, "ether"), {from: accounts[0]});
		assert((await basicToken.balanceOf(accounts[2])).toString() === web3.toWei(1.5, "ether"), "failed 2 of 3 (rd. 2/3) multisig transfer!");

		// ROUND 3: KEYS 2 & 3

		// sign this hash with the second and third key
		// note that the nonce is 5
		var signByKeys = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(0.75, "ether"), accounts[2], 5);
		var signedByKey2 = web3.eth.sign(accounts[2], signByKeys).slice(2);
		var signedByKey3 = web3.eth.sign(accounts[3], signByKeys).slice(2);

		var r1 = '0x' + signedByKey2.slice(0,64);
		var s1 = '0x' + signedByKey2.slice(64,128);
		var v1 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

		var r2 = '0x' + signedByKey3.slice(0,64);
		var s2 = '0x' + signedByKey3.slice(64,128);
		var v2 = web3.toDecimal(signedByKey3.slice(128,130)) + 27;

		await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1], accounts[2], accounts[3]], 2, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 5, accounts[2], web3.toWei(0.75, "ether"), {from: accounts[0]});
		assert((await basicToken.balanceOf(accounts[2])).toString() === web3.toWei(2.25, "ether"), "failed 2 of 3 (rd. 3/3) multisig transfer!");
	});

	it("should fail a 2/2 transfer when the same sig is used twice", async () => {
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[1], accounts[2]], 2);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// sign this hash with the first multisig key, but then submit this twice
		// nonce = 6
		var signByKey1 = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(0.5, "ether"), accounts[2], 6);
		var signedByKey1 = web3.eth.sign(accounts[1], signByKey1).slice(2);
		
		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		try {
			await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1], accounts[2]], 2, [v0, v1, v1], [r0.valueOf(), r1.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf(), s1.valueOf()], 6, accounts[2], web3.toWei(0.5, "ether"), {from: accounts[0]});
			assert(false, "a 2/2 multisig was bypassed by submitting the same (valid) signature twice!");
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...");
		}

	});

	it("should fail a 1/1 transfer when the multsig address cannot be ecrecovered", async () => {
		// note that the private key "signed" an error here, where m = 2 but only a 1/1 multisig by definition
		// so the private key will not be recovered properly
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[1]], 2);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// sign this hash with the first multisig key
		// nonce = 6
		var signByKey1 = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(1.5, "ether"), accounts[2], 6);
		var signedByKey1 = web3.eth.sign(accounts[1], signByKey1).slice(2);
		
		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		try {
			await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1]], 1, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 6, accounts[2], web3.toWei(1.5, "ether"), {from: accounts[0]});
			assert(false, "multisig address should have ec recovered incorrectly, and failed!");
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...");
		}
	});

	it('should allow a 100/100 multsig transfer', async () => {
		assert(accounts.length > 100, "WARNING: this test is gonna fail because you don't have enough accounts, init truffle with -a 101 for 101 accounts");

		var rArray = [];
		var sArray = [];
		var vArray = [];
		var multisigAccounts = [];

		for (var i = 0; i < accounts.length; i++){
			if (i != 9){
				// remember accounts[9] is the temp private key, so don't use that one
				multisigAccounts.push(accounts[i]);
			}
		}

		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m(multisigAccounts, 100);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);

		rArray.push('0x' + signedByPrivateKey.slice(0,64).valueOf());
		sArray.push('0x' + signedByPrivateKey.slice(64,128).valueOf());
		vArray.push(web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27);

		// nonce is at 6
		var signByKeys = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(10, "ether"), accounts[100], 6);
		var signedByKey;

		for (i = 0; i < multisigAccounts.length; i++){
			signedByKey = web3.eth.sign(multisigAccounts[i], signByKeys).slice(2);

			rArray.push('0x' + signedByKey.slice(0,64).valueOf());
			sArray.push('0x' + signedByKey.slice(64,128).valueOf());
			vArray.push(web3.toDecimal(signedByKey.slice(128,130)) + 27);
		}

		await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], multisigAccounts, 100, vArray, rArray, sArray, 6, accounts[100], web3.toWei(10, "ether"), {from: accounts[0]});
		assert((await basicToken.balanceOf(accounts[100])).toString() === web3.toWei(10, "ether"), "failed 100/100 multisig transfer");
	});
})