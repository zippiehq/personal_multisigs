var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");

contract("Test Zippie Multisig Check Cashing Functionality", (accounts) => {

	var test;
	var basicToken;
	var zipperMS;

	beforeEach(() => {
			return TestFunctions.new().then(instance => {
					test = instance;
    			return BasicERC20Mock.new(accounts[100]).then(instance => {
						basicToken = instance;
						return ZippieMultisigWallet.new();
     			}).then(instance => {
     				zipperMS = instance;
						return basicToken.approve(instance.address, web3.toWei(100, "ether"), {from: accounts[100]});
				});
			});
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig, and fail the second time", async () => {
		// accounts[100] is multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
		// accounts[0] is multisig signer (1of1)
		const m = [1, 1, 0, 0]

		var signByPrivateKey = await test.soliditySha3_addresses_m([accounts[0]], m);
		var signedByPrivateKey = web3.eth.sign(accounts[100], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// accounts[99] is random verification key
		// sign by multisig signer
		var signByKey1 = await test.soliditySha3_amount_address(web3.toWei(1, "ether"), accounts[99]);
		var signedByKey1 = web3.eth.sign(accounts[0], signByKey1).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		// account[2] is recipent
		// sign by a random verification key
		var signByVerification = await test.soliditySha3_address(accounts[2]);
		var signedByVerification = web3.eth.sign(accounts[99], signByVerification).slice(2);

		var r2 = '0x' + signedByVerification.slice(0,64);
		var s2 = '0x' + signedByVerification.slice(64,128);
		var v2 = web3.toDecimal(signedByVerification.slice(128,130)) + 27;

		var initialBalanceSender = await basicToken.balanceOf(accounts[100])
		var initialBalanceRecipient = await basicToken.balanceOf(accounts[2])
		assert(await zipperMS.checkCashed(accounts[100], accounts[99]) === false, "check already marked as cashed before transfer");
		
		// account[10] is sponsor (e.g Zippie PMG server)
		// checkAndTransferFrom_BlankCheck(address[] multisigAndERC20Contract, address[] allSignersPossible, uint8 m, uint8[] v, bytes32[] r, bytes32[] s, address recipient, uint256 amount, address verificationKey) public {
		await zipperMS.redeemBlankCheck([accounts[100], basicToken.address, accounts[2], accounts[99]], [accounts[0]], m, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), [], {from: accounts[10]});
		
		var newBalanceSender = await basicToken.balanceOf(accounts[100])
		var newBalanceRecipient = await basicToken.balanceOf(accounts[2])	
		assert(initialBalanceSender.minus(newBalanceSender).toString() === web3.toWei(1, "ether"), "balance did not transfer from sender");
		assert(newBalanceRecipient.minus(initialBalanceRecipient).toString() === web3.toWei(1, "ether"), "balance did not transfer to recipient");
		assert(await zipperMS.checkCashed(accounts[100], accounts[99]) === true, "check has not been marked as cashed after transfer");

		try{
			// try the same exact transfer 			
			await zipperMS.redeemBlankCheck([accounts[100], basicToken.address, accounts[2], accounts[99]], [accounts[0]], [1, 1, 0, 0], [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), [], {from: accounts[10]});
			assert(false, "duplicate transfer went through, but should have failed!")
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', error.message)
		}
	});

	it("should fail a blank check transfer when the verificationKey is false", async () => {
		// accounts[100] is multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
		// accounts[0] is multisig signer (1of1)
		const m = [1, 1, 0, 0]

		var signByPrivateKey = await test.soliditySha3_addresses_m([accounts[0]], m);
		var signedByPrivateKey = web3.eth.sign(accounts[100], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// accounts[99] is random verification key
		// sign by multisig signer
		var signByKey1 = await test.soliditySha3_amount_address(web3.toWei(1, "ether"), accounts[99]);
		var signedByKey1 = web3.eth.sign(accounts[0], signByKey1).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		// account[2] is recipent
		// sign by a wrong verification key, say accounts[98]
		var signByVerification = await test.soliditySha3_address(accounts[2]);
		var signedByVerification = web3.eth.sign(accounts[98], signByVerification).slice(2);

		var r2 = '0x' + signedByVerification.slice(0,64);
		var s2 = '0x' + signedByVerification.slice(64,128);
		var v2 = web3.toDecimal(signedByVerification.slice(128,130)) + 27;

		var initialBalanceSender = await basicToken.balanceOf(accounts[100])
		var initialBalanceRecipient = await basicToken.balanceOf(accounts[2])
		assert(await zipperMS.checkCashed(accounts[100], accounts[99]) === false, "check already marked as cashed before transfer");
		try{
			await zipperMS.redeemBlankCheck([accounts[100], basicToken.address, accounts[2], accounts[98]], [accounts[0]], m, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), [], {from: accounts[10]});
			assert(false, "Verification Key was incorrect, but transfer went through!")
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}

		try{
			await zipperMS.redeemBlankCheck([accounts[100], basicToken.address, accounts[2], accounts[99]], [accounts[0]], m, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), [], {from: accounts[10]});
			assert(false, "Verification Key was correct, transfer still failed!")
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}
		var newBalanceSender = await basicToken.balanceOf(accounts[100])
		var newBalanceRecipient = await basicToken.balanceOf(accounts[2])	
		assert(initialBalanceSender.minus(newBalanceSender).toString() === web3.toWei(0, "ether"), "balance transfer from sender even if transaction didn't went through");
		assert(newBalanceRecipient.minus(initialBalanceRecipient).toString() === web3.toWei(0, "ether"), "balance transfer to recipient even if transaction didn't went through");
		assert(await zipperMS.checkCashed(accounts[100], accounts[99]) === false, "check has been marked as cashed even if transaction didn't went through");
		
	});

	it("should allow a blank check to be cashed from a 2 of 2 multisig", async () => {
		// accounts[100] is multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
		// accounts[0] is multisig signer 1 (1of2)
		// accounts[1] is multisig signer 2 (2of2)
		const signers = [accounts[0], accounts[1]]
		const m = [2, 2, 0, 0]

		var signByPrivateKey = await test.soliditySha3_addresses_m(signers, m);
		var signedByPrivateKey = web3.eth.sign(accounts[100], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// accounts[99] is random verification key
		// sign by multisig signer 1
		var signByKey1 = await test.soliditySha3_amount_address(web3.toWei(1, "ether"), accounts[99]);
		var signedByKey1 = web3.eth.sign(accounts[0], signByKey1).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		// accounts[99] is random verification key
		// sign by multisig signer 2
		var signByKey2 = await test.soliditySha3_amount_address(web3.toWei(1, "ether"), accounts[99]);
		var signedByKey2 = web3.eth.sign(accounts[1], signByKey2).slice(2);

		var r2 = '0x' + signedByKey2.slice(0,64);
		var s2 = '0x' + signedByKey2.slice(64,128);
		var v2 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

		// account[2] is recipent
		// sign by a random verification key
		var signByVerification = await test.soliditySha3_address(accounts[2]);
		var signedByVerification = web3.eth.sign(accounts[99], signByVerification).slice(2);

		var r3 = '0x' + signedByVerification.slice(0,64);
		var s3 = '0x' + signedByVerification.slice(64,128);
		var v3 = web3.toDecimal(signedByVerification.slice(128,130)) + 27;

		var initialBalanceSender = await basicToken.balanceOf(accounts[100])
		var initialBalanceRecipient = await basicToken.balanceOf(accounts[2])
		assert(await zipperMS.checkCashed(accounts[100], accounts[99]) === false, "check already marked as cashed before transfer");
		
		// account[10] is sponsor (e.g Zippie PMG server)
		await zipperMS.redeemBlankCheck([accounts[100], basicToken.address, accounts[2], accounts[99]], signers, m, [v0, v1, v2, v3], [r0.valueOf(), r1.valueOf(), r2.valueOf(), r3.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf(), s3.valueOf()], web3.toWei(1, "ether"), [], {from: accounts[10]});
		
		var newBalanceSender = await basicToken.balanceOf(accounts[100])
		var newBalanceRecipient = await basicToken.balanceOf(accounts[2])
		assert(initialBalanceSender.minus(newBalanceSender).toString() === web3.toWei(1, "ether"), "balance did not transfer from sender");
		assert(newBalanceRecipient.minus(initialBalanceRecipient).toString() === web3.toWei(1, "ether"), "balance did not transfer to recipient");
		assert(await zipperMS.checkCashed(accounts[100], accounts[99]) === true, "check has not been marked as cashed after transfer");
	});
});