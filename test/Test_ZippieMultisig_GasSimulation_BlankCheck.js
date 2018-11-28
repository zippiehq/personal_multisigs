var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWallet.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

contract("Zippie Multisig Gas Simulator", (accounts) => {

	var test;
	var basicToken;
	var zippieCardNonces;
	var zippieWallet;

	beforeEach(() => {
	return TestFunctions.new().then(instance => {
			test = instance;
		return BasicERC20Mock.new(accounts[100]).then(instance => {
			basicToken = instance
			return ZippieCardNonces.new().then(instance => {
				zippieCardNonces = instance
				return ZippieWallet.new(zippieCardNonces.address)}).then(instance => {
					zippieWallet = instance;
					return basicToken.approve(zippieWallet.address, web3.utils.toWei("100", "ether"), {from: accounts[100]});
				});
			});
		});
	});

    it("should run a 1of1 multisig (blank check) through the general function", async () => {

        console.log('GENERAL FUNCTION, 1 : 1 multisig (blank check)');
        console.log('');

        console.log('Gas usage when first using the multisig (blank check)');
        console.log('---------------------------------------');

        var initialBalance = await web3.eth.getBalance(accounts[10]);

		const m = [1, 1, 0, 0]

		// accounts[100] is multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
		// accounts[0] is multisig signer (1of1)
		var signByPrivateKey = await test.soliditySha3_addresses_m([accounts[0]], m);
		var signedByPrivateKey = await web3.eth.sign(signByPrivateKey, accounts[100]);
		signedByPrivateKey = signedByPrivateKey.slice(2)

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.utils.hexToNumber(signedByPrivateKey.slice(128,130)) + 27;

		// accounts[99] is random verification key
		// sign by multisig signer
		var signByKey1 = await test.soliditySha3_amount_address(web3.utils.toWei("1", "ether"), accounts[99]);
		var signedByKey1 = await web3.eth.sign(signByKey1, accounts[0])
		signedByKey1 = signedByKey1.slice(2)

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.utils.hexToNumber(signedByKey1.slice(128,130)) + 27;

        // account[2] is recipent
		// sign by a random verification key
		var signByVerification = await test.soliditySha3_address(accounts[2]);
		var signedByVerification = await web3.eth.sign(signByVerification, accounts[99])
		signedByVerification = signedByVerification.slice(2)

		var r2 = '0x' + signedByVerification.slice(0,64);
		var s2 = '0x' + signedByVerification.slice(64,128);
		var v2 = web3.utils.hexToNumber(signedByVerification.slice(128,130)) + 27;
        
        // account[10] is sponsor (e.g Zippie PMG server)
		// checkAndTransferFrom_BlankCheck(address[] multisigAndERC20Contract, address[] allSignersPossible, uint8 m, uint8[] v, bytes32[] r, bytes32[] s, address recipient, uint256 amount, address verificationKey) public {
		await zipperMS.redeemBlankCheck([accounts[100], basicToken.address, accounts[2], accounts[99]], [accounts[0]], m, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.utils.toWei("1", "ether"), [], {from: accounts[10], gasPrice: 1});
        
        console.log(initialBalance - (await web3.eth.getBalance(accounts[10])).toString() + ' gas was used.');

        console.log('Gas usage on subsequent use of the multisig (blank check)');
        console.log('---------------------------------------');

        var initialBalance = await web3.eth.getBalance(accounts[10]);
        
		// accounts[98] is new random verification key
		// sign by multisig signer
		var signByKey1 = await test.soliditySha3_amount_address(web3.utils.toWei("1", "ether"), accounts[98]);
		var signedByKey1 = await web3.eth.sign(signByKey1, accounts[0])
		signedByKey1 = signedByKey1.slice(2)

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.utils.hexToNumber(signedByKey1.slice(128,130)) + 27;

        // account[2] is recipent
		// sign by a random verification key
		var signByVerification = await test.soliditySha3_address(accounts[2]);
		var signedByVerification = await web3.eth.sign(signByVerification, accounts[98])
		signedByVerification = signedByVerification.slice(2)

		var r2 = '0x' + signedByVerification.slice(0,64);
		var s2 = '0x' + signedByVerification.slice(64,128);
		var v2 = web3.utils.hexToNumber(signedByVerification.slice(128,130)) + 27;

        // account[10] is sponsor (e.g Zippie PMG server)
		await zipperMS.redeemBlankCheck([accounts[100], basicToken.address, accounts[2], accounts[98]], [accounts[0]], m, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.utils.toWei("1", "ether"), [], {from: accounts[10], gasPrice: 1});
        
        console.log(initialBalance - (await web3.eth.getBalance(accounts[10])).toString() + ' gas was used.');
    });

    it("should run a 2of2 multisig (blank check) through the general function", async () => {

        console.log('GENERAL FUNCTION, 2 : 2 multisig (blank check)');
        console.log('');

        console.log('Gas usage when first using the multisig (blank check)');
        console.log('---------------------------------------');

        var initialBalance = await web3.eth.getBalance(accounts[10]);

		const m = [2, 2, 0, 0]

        // accounts[100] is multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
		// accounts[0] is multisig signer 1 (1of2)
		// accounts[1] is multisig signer 2 (2of2)
        var signByPrivateKey = await test.soliditySha3_addresses_m([accounts[0], accounts[1]], m);
		var signedByPrivateKey = await web3.eth.sign(signByPrivateKey, accounts[100])
		signedByPrivateKey = signedByPrivateKey.slice(2)

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.utils.hexToNumber(signedByPrivateKey.slice(128,130)) + 27;

		// accounts[99] is random verification key
		// sign by multisig signer 1
		var signByKey1 = await test.soliditySha3_amount_address(web3.utils.toWei("1", "ether"), accounts[99]);
		var signedByKey1 = await web3.eth.sign(signByKey1, accounts[0])
		signedByKey1 = signedByKey1.slice(2)

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.utils.hexToNumber(signedByKey1.slice(128,130)) + 27;

        // accounts[99] is random verification key
		// sign by multisig signer 2
		var signByKey2 = await test.soliditySha3_amount_address(web3.utils.toWei("1", "ether"), accounts[99]);
		var signedByKey2 = await web3.eth.sign(signByKey2, accounts[1])
		signedByKey2 = signedByKey2.slice(2)

		var r2 = '0x' + signedByKey2.slice(0,64);
		var s2 = '0x' + signedByKey2.slice(64,128);
		var v2 = web3.utils.hexToNumber(signedByKey2.slice(128,130)) + 27;

		// account[2] is recipent
		// sign by a random verification key
		var signByVerification = await test.soliditySha3_address(accounts[3]);
		var signedByVerification = await web3.eth.sign(signByVerification, accounts[99])
		signedByVerification = signedByVerification.slice(2)

		var r3 = '0x' + signedByVerification.slice(0,64);
		var s3 = '0x' + signedByVerification.slice(64,128);
		var v3 = web3.utils.hexToNumber(signedByVerification.slice(128,130)) + 27;

        // account[10] is sponsor (e.g Zippie PMG server)
		await zipperMS.redeemBlankCheck([accounts[100], basicToken.address, accounts[3], accounts[99]], [accounts[0], accounts[1]], m, [v0, v1, v2, v3], [r0.valueOf(), r1.valueOf(), r2.valueOf(), r3.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf(), s3.valueOf()], web3.utils.toWei("1", "ether"), [], {from: accounts[10], gasPrice: 1});
        
        console.log(initialBalance - (await web3.eth.getBalance(accounts[10])).toString() + ' gas was used.');

        console.log('Gas usage on subsequent use of the multisig (blank check)');
        console.log('---------------------------------------');

        var initialBalance = await web3.eth.getBalance(accounts[10]);
        
		// accounts[98] is new random verification key
		// sign by multisig signer 1
		var signByKey1 = await test.soliditySha3_amount_address(web3.utils.toWei("1", "ether"), accounts[98]);
		var signedByKey1 = await web3.eth.sign(signByKey1, accounts[0])
		signedByKey1 = signedByKey1.slice(2)

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.utils.hexToNumber(signedByKey1.slice(128,130)) + 27;

        // accounts[98] is new random verification key
		// sign by multisig signer 2
		var signByKey2 = await test.soliditySha3_amount_address(web3.utils.toWei("1", "ether"), accounts[98]);
		var signedByKey2 = await web3.eth.sign(signByKey2, accounts[1])
		signedByKey2 = signedByKey2.slice(2)

		var r2 = '0x' + signedByKey2.slice(0,64);
		var s2 = '0x' + signedByKey2.slice(64,128);
		var v2 = web3.utils.hexToNumber(signedByKey2.slice(128,130)) + 27;

        // account[2] is recipent
		// sign by a random verification key
		var signByVerification = await test.soliditySha3_address(accounts[2]);
		var signedByVerification = await web3.eth.sign(signByVerification, accounts[98])
		signedByVerification = signedByVerification.slice(2)
        
		var r3 = '0x' + signedByVerification.slice(0,64);
		var s3 = '0x' + signedByVerification.slice(64,128);
		var v3 = web3.utils.hexToNumber(signedByVerification.slice(128,130)) + 27;
        
        // account[10] is sponsor (e.g Zippie PMG server)
		await zipperMS.redeemBlankCheck([accounts[100], basicToken.address, accounts[2], accounts[98]], [accounts[0], accounts[1]], m, [v0, v1, v2, v3], [r0.valueOf(), r1.valueOf(), r2.valueOf(), r3.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf(), s3.valueOf()], web3.utils.toWei("1", "ether"), [], {from: accounts[10], gasPrice: 1});
                
        console.log(initialBalance - (await web3.eth.getBalance(accounts[10])).toString() + ' gas was used.');
    });
})