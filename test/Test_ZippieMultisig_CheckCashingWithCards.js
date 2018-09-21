var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");
var test;
import { getMultisigSignature, getBlankCheckSignature, getRecipientSignature, getDigestSignature, getSignature, log } from './HelpFunctions';

contract("Test Zippie Multisig Check Cashing With Cards Functionality", (accounts) => {

	var basicToken;
	var zipperMS;

	const signer = accounts[0] // multisig signer (1of1)
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

	it("should allow a blank check to be cashed once from a 1 of 1 multisig with 2FA, and fail the second time", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const digest = '0xABCDEF'
		const digestHash = await test.soliditySha3_sign(digest)
		const digestSignature = await getDigestSignature(digestHash, card)
		
		const signature = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestHash], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try {
			// try the same exact transfer
			await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestHash], {from: sponsor});
			assert(false, "duplicate transfer went through, but should have failed!")
		} catch(error){
			assert(error.reason == 'Invalid blank check', error.reason)
			assert(error.message.includes('VM Exception while processing transaction: revert'), error.message)
		}
	});

	it("should allow a blank check to be cashed once even if no card is required, and fail the second time", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 0, 0]

		const multisigSignature = await getMultisigSignature([signer], m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const v = [multisigSignature.v, blankCheckSignature.v, recipientSignature.v]
		const r = [multisigSignature.r.valueOf(), blankCheckSignature.r.valueOf(), recipientSignature.r.valueOf()]
		const s = [multisigSignature.s.valueOf(), blankCheckSignature.s.valueOf(), recipientSignature.s.valueOf()]

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zipperMS.redeemBlankCheck(addresses, [signer], m, v, r, s, amount, [], {from: sponsor});

		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try{
			// try the same exact transfer
			await zipperMS.redeemBlankCheck(addresses, [signer], m, v, r, s, amount, [], {from: sponsor});
			assert(false, "duplicate transfer went through, but should have failed!")
		} catch(error){
			assert(error.reason == 'Invalid blank check', error.reason)
		}
	});

	it("should allow a blank check to be cashed when using two cards, and fail the second time if card digest is reused", async () => {
		const card2 = accounts[7]
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card2]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		// card 1
		const digest = '0xABCDEF'
		var digestHash = await test.soliditySha3_sign(digest)
		const digestSignature = await getDigestSignature(digestHash, card)
		
		// card 2
		const digest2 = '0xFEDCBA'
		const digestHash2 = await test.soliditySha3_sign(digest2)
		const digestSignature2 = await getDigestSignature(digestHash2, card2)
		
		const v = [multisigSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v, recipientSignature.v]
		const r = [multisigSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf(), recipientSignature.r.valueOf()]
		const s = [multisigSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf(), recipientSignature.s.valueOf()]

		const digestHashes = [digestHash, digestHash2]

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zipperMS.redeemBlankCheck(addresses, signers, m, v, r, s, amount, digestHashes, {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try {
			// try transfer reusing card digest
			const duplicatedDigestHashes = [digestHash, digestHash]

			await zipperMS.redeemBlankCheck(addresses, signers, m, v, r, s, amount, duplicatedDigestHashes, {from: sponsor});
			assert(false, "duplicated digest transfer went through, but should have failed!")
		} catch(error) {
			assert(error.message.includes('VM Exception while processing transaction: revert'), error.message)
		}
	});

	it("should prevent a blank check to be cashed if card is incorrectly signed", async () => {
		const payer = accounts[1]

		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const digest = '0xABCDEF'
		const digestHash = await test.soliditySha3_sign(digest)
		// sign with incorrect account
		const digestSignature = await getDigestSignature(digestHash, payer)
		
		const signature = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");

		try {
			const amount = web3.utils.toWei("1", "ether")
			await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestHash], {from: sponsor});
			assert(false, "transfer went through even though card was signed by wrong account")
		} catch (error) {
			assert(error.message.includes('VM Exception while processing transaction: revert'), error.message)
		}
	});
});
