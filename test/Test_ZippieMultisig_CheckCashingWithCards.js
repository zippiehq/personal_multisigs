var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");
var test;
import { getMultisigSignature, getBlankCheckSignature, getRecipientSignature, getHardcodedDigestSignature, getSignature, log } from './HelpFunctions';

contract("Test Zippie Multisig Check Cashing With Cards Functionality", (accounts) => {

	var basicToken;
	var zipperMS;

	const signer = accounts[0] // multisig signer (1of1)
	const recipient = accounts[2]
	var card = accounts[3]
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

	it("should allow a blank check to be cashed once from a 1 of 1 multisig with 2FA, and fail the second time", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		card = digestSignature.pubkey

		var addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)
		
		const signature = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestSignature.digestHash], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zipperMS.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try {
			// try the same exact transfer
			await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestSignature.digestHash], {from: sponsor});
			assert(false, "duplicate transfer went through, but should have failed!")
		} catch(error) {
			assert(error.reason == 'Invalid nonce', error.reason)
		}
	});

	it("should allow a blank check to be cashed when using two cards", async () => {
		// card 1
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		card = digestSignature.pubkey

		// card 2
		const digestSignature2 = await getHardcodedDigestSignature(1, 0)
		const card2 = digestSignature2.pubkey
		
		var addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card2]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const v = [multisigSignature.v, recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v]
		const r = [multisigSignature.r.valueOf(), recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf()]
		const s = [multisigSignature.s.valueOf(), recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf()]

		const digestHashes = [digestSignature.digestHash, digestSignature2.digestHash]

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zipperMS.redeemBlankCheck(addresses, signers, m, v, r, s, amount, digestHashes, {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zipperMS.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");
	});
});
