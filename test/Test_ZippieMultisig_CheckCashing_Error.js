var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWallet.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");
import { getMultisigSignature, getBlankCheckSignature, getRecipientSignature, getSignature, getSignatureFrom3, log } from './HelpFunctions';

contract("Test Zippie Multisig Check Cashing Error Cases", (accounts) => {

	var test;
	var basicToken;
	var zippieCardNonces;
	var zippieWallet;

	const signer = accounts[0] // multisig signer (1of1)
	const signer2 = accounts[2] // multisig signer (2of2)
	const recipient = accounts[2]
	const verificationKey = accounts[4] // random verification key
	const multisig = accounts[5] // multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
	const sponsor = accounts[6] // Zippie PMG server

	beforeEach(() => {
			return TestFunctions.new().then(instance => {
					test = instance;
    			return BasicERC20Mock.new(accounts[5]).then(instance => {
						basicToken = instance;
						return ZippieCardNonces.new().then(instance => {
							zippieCardNonces = instance
							return ZippieWallet.new(zippieCardNonces.address)}).then(instance => {
     						zippieWallet = instance;
								return basicToken.approve(instance.address, web3.utils.toWei("100", "ether"), {from: accounts[5]});
					});
				});
			});
	});

	it("should fail a blank check transfer (from a 1 of 1 multisig) if incorrect signer", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const incorrectSigner = accounts[42]
		const incorrectSigners = [incorrectSigner]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignatureFrom3(multisigSignature, blankCheckSignature, recipientSignature)
		
		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		try {			
			// redeem using incorrect signer
			await zippieWallet.redeemBlankCheck(addresses, incorrectSigners, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "transfer went through even though incorrect signer")
		} catch(error) {
			assert(error.reason == 'Invalid account', error.reason)
		}

		await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
		
		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "balance did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "balance did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");
	});

	it("should fail a blank check transfer (from a 1 of 1 multisig) if data is signed by incorrect signer", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const incorrectSigner = accounts[42]

		// sign incorrect data
		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, incorrectSigner, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignatureFrom3(multisigSignature, blankCheckSignature, recipientSignature)
		
		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "transfer went through even though incorrect data was signed")
		} catch(error) {
			assert(error.reason == 'Invalid address found when verifying signer signatures', error.reason)
		}
		
		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(initialBalanceSender.toString() === newBalanceSender.toString(), "sender balance changed even though no transfer happened");
		assert(initialBalanceRecipient.toString() === newBalanceRecipient.toString(), "recipient balance changed even though no transfer happened");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened");
	});

	it("should fail a blank check transfer (from a 2 of 2 multisig) if 1 incorrect signer", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, signer2]
		const m = [2, 2, 0, 0]
		const incorrectSigner = accounts[42]
		const incorrectSigners = [incorrectSigner, signer2]
		const blankCheckAmount = "1"

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, blankCheckAmount)
		const blankCheckSignature2 = await getBlankCheckSignature(verificationKey, signer2, blankCheckAmount)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(multisigSignature, blankCheckSignature, blankCheckSignature2, recipientSignature)

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei(blankCheckAmount, "ether")
		try {
			await zippieWallet.redeemBlankCheck(addresses, incorrectSigners, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "transfer went through even though incorrect signer")
		} catch(error) {
			assert(error.reason == 'Invalid account', error.reason)
		}
		
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened")
	});

	it("should fail a blank check transfer (from a 2 of 2 multisig) if data is signed by incorrect signer", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, signer2]
		const m = [2, 2, 0, 0]
		const incorrectSigner = accounts[42]
		const blankCheckAmount = "1"

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, incorrectSigner, blankCheckAmount)
		const blankCheckSignature2 = await getBlankCheckSignature(verificationKey, signer2, blankCheckAmount)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(multisigSignature, blankCheckSignature, blankCheckSignature2, recipientSignature)

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei(blankCheckAmount, "ether")
		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "transfer went through even though incorrect data was signed")
		} catch(error) {
			assert(error.reason == 'Invalid address found when verifying signer signatures', error.reason)
		}
		
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened")
	});

	it("should fail a blank check transfer (from a 2 of 2 multisig) if signers are the same", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, signer]
		const m = [2, 2, 0, 0]
		const blankCheckAmount = "1"

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, blankCheckAmount)
		const blankCheckSignature2 = await getBlankCheckSignature(verificationKey, signer2, blankCheckAmount)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(multisigSignature, blankCheckSignature, blankCheckSignature2, recipientSignature)

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei(blankCheckAmount, "ether")
		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "transfer went through even though signers were the same")
		} catch(error) {
			assert(error.reason == 'Invalid address found when verifying signer signatures', error.reason)
		}
		
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened")
	});

	it("should fail a blank check transfer when the verificationKey is wrong", async () => {
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
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		const addresses2 = [multisig, basicToken.address, recipient, wrongVerificationKey]
		
		const amount = web3.utils.toWei("1", "ether")
		try {
			await zippieWallet.redeemBlankCheck(addresses2, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "Verification Key was incorrect, but transfer went through!")
		} catch(error) {
			assert(error.reason === 'Invalid address found when verifying signer signatures', error.reason)
		}

		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "Verification Key was correct, transfer still failed!")
		} catch(error) {
			assert(error.reason === 'Invalid nonce', error.reason)
		}

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === web3.utils.toWei("0", "ether"), "balance transfer from sender even if transaction didn't went through");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === web3.utils.toWei("0", "ether"), "balance transfer to recipient even if transaction didn't went through");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check has been marked as cashed even if transaction didn't went through");
	});
});