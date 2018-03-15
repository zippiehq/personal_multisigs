var BasicERC20 = artifacts.require("./BasicERC20.sol");
var ZipperMultisigWallet = artifacts.require("./ZipperMultisigWallet.sol");

contract("Test Zipper Multisig", (accounts) => {
	// accounts[9] is the "temporary private key"

	it("should deploy zipper multisig, and basic ERC20 test contract, and fund accounts[9] and approve the zipper multisig for full balance", async () => {
		
		var zipperMS = await ZipperMultisigWallet.at(ZipperMultisigWallet.address);
		var basicToken = await BasicERC20.at(BasicERC20.address);

		// make sure that initial balances are set, and the zipper contract is approved 
		assert((await basicToken.balanceOf(accounts[9])).toString() === web3.toWei(100, "ether"), "balance of temp priv key != initial balance");
		assert((await basicToken.allowance(accounts[9], ZipperMultisigWallet.address)).toString() === web3.toWei(100, "ether"), "temp priv key has not approved Zipper Multisig for withdrawals");
	});

	it("should allow 1 of 1 multisig transfer, and fail any duplicate transfer", async () => {

		var zipperMS = await ZipperMultisigWallet.at(ZipperMultisigWallet.address);
		var basicToken = await BasicERC20.at(BasicERC20.address);

		// hash ([address], 1) in the EVM and then sign it with the temporary private key
		// according to the zipper multisig, this allows 'address' to transfer funds out of temp priv key
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[0]], 1);
		var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);
		
		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;;

		await zipperMS.checkAndTransferFrom_SenderSigner([accounts[9], basicToken.address], [accounts[0]], 1, [v0], [r0.valueOf()], [s0.valueOf()], 1, accounts[0], web3.toWei(1, "ether"), {from: accounts[0]});

		assert((await basicToken.balanceOf(accounts[0])).toString() === web3.toWei(1, "ether"), "failed 1 of 1 multisig transfer!");

		try {
			// try the same exact transfer 
			await zipperMS.checkAndTransferFrom_SenderSigner([accounts[9], basicToken.address], [accounts[0]], 1, [v0], [r0.valueOf()], [s0.valueOf()], 1, accounts[0], web3.toWei(1, "ether"), {from: accounts[0]});
			assert(false, "duplicate transfer went through, but should have failed!")

		} catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}
	});

	it("should allow 2 of 2 multisig transfer", async () => {
		var zipperMS = await ZipperMultisigWallet.at(ZipperMultisigWallet.address);
		var basicToken = await BasicERC20.at(BasicERC20.address);

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

		// check and transfer with a 2 of 2 with nonce == 2
		await zipperMS.checkAndTransferFrom_SenderSigner([accounts[9], basicToken.address], [accounts[1], accounts[2]], 2, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 2, accounts[1], web3.toWei(0.5, "ether"), {from: accounts[2]});

		assert((await basicToken.balanceOf(accounts[1])).toString() === web3.toWei(0.5, "ether"), "failed 2 of 2 multisig transfer!");
	});

	it("should fail 2 of 2 multisig transfer, when amount is not agreed upon", async () => {
		var zipperMS = await ZipperMultisigWallet.at(ZipperMultisigWallet.address);
		var basicToken = await BasicERC20.at(BasicERC20.address);

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

		try {
			// check and transfer with a 2 of 2 with nonce == 2, where the value being transfered is agreed by #1, but not #2
			await zipperMS.checkAndTransferFrom_SenderSigner([accounts[9], basicToken.address], [accounts[1], accounts[2]], 2, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 3, accounts[2], web3.toWei(0.51, "ether"), {from: accounts[2]});
			assert(false, "transfer should have failed! amount was not agreed by #1");
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")		
		}
	});

	it("should pass all three (correct) variants of 2 of 3 multisig transfer", async () => {
		var zipperMS = await ZipperMultisigWallet.at(ZipperMultisigWallet.address);
		var basicToken = await BasicERC20.at(BasicERC20.address);

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

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		await zipperMS.checkAndTransferFrom_SenderSigner([accounts[9], basicToken.address], [accounts[1], accounts[2], accounts[3]], 2, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 3, accounts[2], web3.toWei(0.75, "ether"), {from: accounts[2]});
		assert((await basicToken.balanceOf(accounts[2])).toString() === web3.toWei(0.75, "ether"), "failed 2 of 3 (rd. 1/3) multisig transfer!");

		// ROUND 2: KEYS 1 & 3

		// sign this hash with the first and third key
		// note that the nonce is 4
		var signByKeys = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(0.75, "ether"), accounts[2], 4);
		var signedByKey3 = web3.eth.sign(accounts[3], signByKeys).slice(2);

		var r2 = '0x' + signedByKey3.slice(0,64);
		var s2 = '0x' + signedByKey3.slice(64,128);
		var v2 = web3.toDecimal(signedByKey3.slice(128,130)) + 27;

		await zipperMS.checkAndTransferFrom_SenderSigner([accounts[9], basicToken.address], [accounts[1], accounts[2], accounts[3]], 2, [v0, v2], [r0.valueOf(), r2.valueOf()], [s0.valueOf(), s2.valueOf()], 4, accounts[2], web3.toWei(0.75, "ether"), {from: accounts[1]});
		assert((await basicToken.balanceOf(accounts[2])).toString() === web3.toWei(1.5, "ether"), "failed 2 of 3 (rd. 2/3) multisig transfer!");

		// ROUND 3: KEYS 2 & 3

		// sign this hash with the second and third key
		// note that the nonce is 5
		var signByKeys = await zipperMS.soliditySha3_amount_recipient_nonce(web3.toWei(0.75, "ether"), accounts[2], 5);
		var signedByKey2 = web3.eth.sign(accounts[2], signByKeys).slice(2);

		var r1 = '0x' + signedByKey2.slice(0,64);
		var s1 = '0x' + signedByKey2.slice(64,128);
		var v1 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

		await zipperMS.checkAndTransferFrom_SenderSigner([accounts[9], basicToken.address], [accounts[1], accounts[2], accounts[3]], 2, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 5, accounts[2], web3.toWei(0.75, "ether"), {from: accounts[3]});
		assert((await basicToken.balanceOf(accounts[2])).toString() === web3.toWei(2.25, "ether"), "failed 2 of 3 (rd. 3/3) multisig transfer!");
	});

	it("should fail a 2/2 transfer when msg.sender signs and sends", async () => {
		var zipperMS = await ZipperMultisigWallet.at(ZipperMultisigWallet.address);
		var basicToken = await BasicERC20.at(BasicERC20.address);

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
			await zipperMS.checkAndTransferFrom([accounts[9], basicToken.address], [accounts[1], accounts[2]], 2, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 6, accounts[2], web3.toWei(0.5, "ether"), {from: accounts[1]});
			assert(false, "a 2/2 multisig was bypassed by signing and sending!");
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...");
		}

	});
})