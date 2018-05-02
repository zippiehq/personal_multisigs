var BasicERC20 = artifacts.require("./BasicERC20.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");

contract("Test Zippie Multisig Check Cashing Functionality", (accounts) => {

	var basicToken;
	var zipperMS;

	beforeEach( () => {
    	return BasicERC20.new(accounts[100]).then( (instance) => {
    		basicToken = instance;
    		return ZippieMultisigWallet.new();
     	}).then( (instance) => {
     		zipperMS = instance;
     		return basicToken.approve(instance.address, web3.toWei(100, "ether"), {from: accounts[100]});
     	});
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig, and fail the second time", async () => {
		// multisig wallet is accounts[100]
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[0]], 1);
		var signedByPrivateKey = web3.eth.sign(accounts[100], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// verification key is accounts[99]
		var signByKey1 = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), accounts[99]);
		var signedByKey1 = web3.eth.sign(accounts[0], signByKey1).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		var signByVerification = await zipperMS.soliditySha3_address(accounts[1]);
		var signedByVerification = web3.eth.sign(accounts[99], signByVerification).slice(2);

		var r2 = '0x' + signedByVerification.slice(0,64);
		var s2 = '0x' + signedByVerification.slice(64,128);
		var v2 = web3.toDecimal(signedByVerification.slice(128,130)) + 27;

		//checkAndTransferFrom_BlankCheck(address[] multisigAndERC20Contract, address[] allSignersPossible, uint8 m, uint8[] v, bytes32[] r, bytes32[] s, uint256 amount, address verificationKey) public {
		await zipperMS.checkAndTransferFrom_BlankCheck([accounts[100], basicToken.address], [accounts[0]], 1, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), accounts[99], {from: accounts[1]});
		assert((await basicToken.balanceOf(accounts[1])).toString() === web3.toWei(1, "ether"), "balance did not transfer");

	});

	it("should fail a blank check transfer when the verificationKey is false", async () => {
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[0]], 1);
		var signedByPrivateKey = web3.eth.sign(accounts[100], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// verification key is accounts[99]
		var signByKey1 = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), accounts[99]);
		var signedByKey1 = web3.eth.sign(accounts[0], signByKey1).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		// sign by a wrong verification key, say accounts[98]
		var signByVerification = await zipperMS.soliditySha3_address(accounts[1]);
		var signedByVerification = web3.eth.sign(accounts[98], signByVerification).slice(2);

		var r2 = '0x' + signedByVerification.slice(0,64);
		var s2 = '0x' + signedByVerification.slice(64,128);
		var v2 = web3.toDecimal(signedByVerification.slice(128,130)) + 27;

		try{
			await zipperMS.checkAndTransferFrom_BlankCheck([accounts[100], basicToken.address], [accounts[0]], 1, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), accounts[98], {from: accounts[1]});
			assert(false, "Verification Key was incorrect, but transfer went through!")
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}

		try{
			await zipperMS.checkAndTransferFrom_BlankCheck([accounts[100], basicToken.address], [accounts[0]], 1, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), accounts[99], {from: accounts[1]});
			assert(false, "Verification Key was incorrect, but transfer went through!")
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', "incorrect error type...")
		}
		
	});

	it("should allow a blank check to be cashed from a 2 of 2 multisig", async () => {
		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m([accounts[0], accounts[1]], 2);
		var signedByPrivateKey = web3.eth.sign(accounts[100], signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// verification key is accounts[99]
		var signByKey1 = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), accounts[99]);
		var signedByKey1 = web3.eth.sign(accounts[0], signByKey1).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		var signByKey2 = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), accounts[99]);
		var signedByKey2 = web3.eth.sign(accounts[1], signByKey1).slice(2);

		var r2 = '0x' + signedByKey2.slice(0,64);
		var s2 = '0x' + signedByKey2.slice(64,128);
		var v2 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

		// accounts[2] is going to "cash" this check
		var signByVerification = await zipperMS.soliditySha3_address(accounts[2]);
		var signedByVerification = web3.eth.sign(accounts[99], signByVerification).slice(2);

		var r3 = '0x' + signedByVerification.slice(0,64);
		var s3 = '0x' + signedByVerification.slice(64,128);
		var v3 = web3.toDecimal(signedByVerification.slice(128,130)) + 27;

		await zipperMS.checkAndTransferFrom_BlankCheck([accounts[100], basicToken.address], [accounts[0], accounts[1]], 2, [v0, v1, v2, v3], [r0.valueOf(), r1.valueOf(), r2.valueOf(), r3.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf(), s3.valueOf()], web3.toWei(1, "ether"), accounts[99], {from: accounts[2]});
		assert((await basicToken.balanceOf(accounts[2])).toString() === web3.toWei(1, "ether"), "balance did not transfer");
	});
});