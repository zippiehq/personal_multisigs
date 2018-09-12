var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");

contract("Zippie Multisig Gas Simulator", (accounts) => {

	var test;
	var basicToken;
	var zipperMS;

	beforeEach(() => {
        return TestFunctions.new().then(instance => {
                test = instance;
            return BasicERC20Mock.new(accounts[9]).then(instance => {
                    basicToken = instance;
                    return ZippieMultisigWallet.new();
            }).then(instance => {
                zipperMS = instance;
                    return basicToken.approve(instance.address, web3.toWei(100, "ether"), {from: accounts[9]});
            });
        });
	});

    it("should run a 1of1 multisig through the general function", async () => {

        console.log('GENERAL FUNCTION, 1 : 1 multisig');
        console.log('');

        console.log('Gas usage when first using the multisig');
        console.log('---------------------------------------');

        var initialBalance = await web3.eth.getBalance(accounts[10]);

		const m = [1, 1, 0, 0]

        var signByPrivateKey = await test.soliditySha3_addresses_m([accounts[0]], m);
        var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);
        
        var r0 = '0x' + signedByPrivateKey.slice(0,64);
        var s0 = '0x' + signedByPrivateKey.slice(64,128);
        var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;;
        
        var signByKey1 = await test.soliditySha3_amount_recipient_nonce(web3.toWei(1, "ether"), accounts[0], 1);
        var signedByKey1 = web3.eth.sign(accounts[0], signByKey1).slice(2);
        
        var r1 = '0x' + signedByKey1.slice(0,64);
        var s1 = '0x' + signedByKey1.slice(64,128);
        var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

        await zipperMS.redeemCheck([accounts[9], basicToken.address, accounts[0]], [accounts[0]], m, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 1, web3.toWei(1, "ether"), [], {from: accounts[10], gasPrice: 1});

        console.log(initialBalance.minus(await web3.eth.getBalance(accounts[10])).toString() + ' gas was used.');

        console.log('Gas usage on subsequent use of the multisig');
        console.log('---------------------------------------');

        var initialBalance = await web3.eth.getBalance(accounts[10]);

        var signByKey1 = await test.soliditySha3_amount_recipient_nonce(web3.toWei(1, "ether"), accounts[0], 2);
        var signedByKey1 = web3.eth.sign(accounts[0], signByKey1).slice(2);
        
        var r1 = '0x' + signedByKey1.slice(0,64);
        var s1 = '0x' + signedByKey1.slice(64,128);
        var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

         await zipperMS.redeemCheck([accounts[9], basicToken.address, accounts[0]], [accounts[0]], m, [v0, v1], [r0.valueOf(), r1.valueOf()], [s0.valueOf(), s1.valueOf()], 2, web3.toWei(1, "ether"), [], {from: accounts[10], gasPrice: 1});

         console.log(initialBalance.minus(await web3.eth.getBalance(accounts[10])).toString() + ' gas was used.');

    });

    it("should run a 2of2 multisig through the general function", async () => {

        console.log('GENERAL FUNCTION, 2 : 2 multisig');
        console.log('');

         console.log('Gas usage when first using the multisig');
        console.log('---------------------------------------');

        var initialBalance = await web3.eth.getBalance(accounts[10]);

		const m = [2, 2, 0, 0]

        var signByPrivateKey = await test.soliditySha3_addresses_m([accounts[0], accounts[1]], m);
        var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);
        
        var r0 = '0x' + signedByPrivateKey.slice(0,64);
        var s0 = '0x' + signedByPrivateKey.slice(64,128);
        var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;;
        
        var signByKeys = await test.soliditySha3_amount_recipient_nonce(web3.toWei(1, "ether"), accounts[0], 1);
        var signedByKey1 = web3.eth.sign(accounts[0], signByKeys).slice(2);
        
        var r1 = '0x' + signedByKey1.slice(0,64);
        var s1 = '0x' + signedByKey1.slice(64,128);
        var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

        var signedByKey2 = web3.eth.sign(accounts[1], signByKeys).slice(2);
        
        var r2 = '0x' + signedByKey2.slice(0,64);
        var s2 = '0x' + signedByKey2.slice(64,128);
        var v2 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

        await zipperMS.redeemCheck([accounts[9], basicToken.address, accounts[0]], [accounts[0], accounts[1]], m, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 1, web3.toWei(1, "ether"), [], {from: accounts[10], gasPrice: 1}); 

        console.log(initialBalance.minus(await web3.eth.getBalance(accounts[10])).toString() + ' gas was used.');

        console.log('Gas usage on subsequent use of the multisig');
        console.log('---------------------------------------');

        initialBalance = await web3.eth.getBalance(accounts[10]);

        var signByPrivateKey = await test.soliditySha3_addresses_m([accounts[0], accounts[1]], m);
        var signedByPrivateKey = web3.eth.sign(accounts[9], signByPrivateKey).slice(2);
        
        var r0 = '0x' + signedByPrivateKey.slice(0,64);
        var s0 = '0x' + signedByPrivateKey.slice(64,128);
        var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;;
        
        var signByKeys = await test.soliditySha3_amount_recipient_nonce(web3.toWei(1, "ether"), accounts[0], 2);
        var signedByKey1 = web3.eth.sign(accounts[0], signByKeys).slice(2);
        
        var r1 = '0x' + signedByKey1.slice(0,64);
        var s1 = '0x' + signedByKey1.slice(64,128);
        var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

        var signedByKey2 = web3.eth.sign(accounts[1], signByKeys).slice(2);
        
        var r2 = '0x' + signedByKey2.slice(0,64);
        var s2 = '0x' + signedByKey2.slice(64,128);
        var v2 = web3.toDecimal(signedByKey2.slice(128,130)) + 27;

        await zipperMS.redeemCheck([accounts[9], basicToken.address, accounts[0]], [accounts[0], accounts[1]], m, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], 2, web3.toWei(1, "ether"), [], {from: accounts[10], gasPrice: 1});

        console.log(initialBalance.minus(await web3.eth.getBalance(accounts[10])).toString() + ' gas was used.');

    });
    
})