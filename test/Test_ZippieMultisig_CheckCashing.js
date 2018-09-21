var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");
import { getMultisigSignature, getBlankCheckSignature, getRecipientSignature, getSignature, getSignatureFrom3, log } from './HelpFunctions';

contract("Test Zippie Multisig Check Cashing Functionality", (accounts) => {

	var test;
	var basicToken;
	var zipperMS;

	const signer = accounts[0] // multisig signer (1of1)
	const signer2 = accounts[2] // multisig signer (2of2)
	const recipient = accounts[2]
	const card = accounts[3]
	const verificationKey = accounts[4] // random verification key
	const multisig = accounts[5] // multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
	const sponsor = accounts[6] // Zippie PMG server

	beforeEach(() => {
			return TestFunctions.new().then(instance => {
					test = instance;
    			return BasicERC20Mock.new(accounts[5]).then(instance => {
						basicToken = instance;
						return ZippieMultisigWallet.new();
     			}).then(instance => {
     				zipperMS = instance;
						return basicToken.approve(instance.address, web3.utils.toWei("100", "ether"), {from: accounts[5]});
				});
			});
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig, and fail the second time", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer]
		const m = [1, 1, 0, 0]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignatureFrom3(multisigSignature, blankCheckSignature, recipientSignature)
		
		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
		
		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "balance did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "balance did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try {
			// try the same exact transfer 			
			await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "duplicate transfer went through, but should have failed!")
		} catch(error) {
			assert(error.reason == 'Invalid blank check', error.reason)
		}
	});

	it("should fail a blank check transfer when the verificationKey is false", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const wrongVerificationKey = accounts[98]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, wrongVerificationKey)

		const signature = getSignatureFrom3(multisigSignature, blankCheckSignature, recipientSignature)

		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		const addresses2 = [multisig, basicToken.address, recipient, wrongVerificationKey]
		
		const amount = web3.utils.toWei("1", "ether")
		try {
			await zipperMS.redeemBlankCheck(addresses2, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "Verification Key was incorrect, but transfer went through!")
		} catch(error) {
			assert(error.message.includes('VM Exception while processing transaction: revert'), "incorrect error type...")
		}

		try {
			await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "Verification Key was correct, transfer still failed!")
		} catch(error) {
			assert(error.message.includes('VM Exception while processing transaction: revert'), "incorrect error type 2...")
		}

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === web3.utils.toWei("0", "ether"), "balance transfer from sender even if transaction didn't went through");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === web3.utils.toWei("0", "ether"), "balance transfer to recipient even if transaction didn't went through");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check has been marked as cashed even if transaction didn't went through");
	});

	it("should allow a blank check to be cashed from a 2 of 2 multisig", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, signer2]
		const m = [2, 2, 0, 0]
		const blankCheckAmount = "1"

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, blankCheckAmount)
		const blankCheckSignature2 = await getBlankCheckSignature(verificationKey, signer2, blankCheckAmount)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(multisigSignature, blankCheckSignature, blankCheckSignature2, recipientSignature)

		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei(blankCheckAmount, "ether")
		await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
		
		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "balance did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "balance did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");
	});
});