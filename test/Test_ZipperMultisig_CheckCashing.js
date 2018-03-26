var BasicERC20 = artifacts.require("./BasicERC20.sol");
var ZipperMultisigWallet = artifacts.require("./ZipperMultisigWallet.sol");

contract("Test Zipper Multisig Check Cashing Functionality", (accounts) => {

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

	it("should allow a blank check to be cashed once from a 1 of 1 multisig, and fail the second time", async (){

	});

	it("should fail a blank check transfer when the verificationKey is false", async (){

	});


});