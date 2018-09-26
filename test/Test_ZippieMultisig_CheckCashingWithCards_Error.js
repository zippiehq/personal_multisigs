var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");
var test;
import { getMultisigSignature, getBlankCheckSignature, getRecipientSignature, getDigestSignature, getSignature, log } from './HelpFunctions';

contract("Test Zippie Multisig Check Cashing With Cards Error Cases", (accounts) => {

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

	it("should fail a blank check transfer (from a 1 of 1 multisig with 2FA) if nonce is signed by incorrect card", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const incorrectCard = accounts[42]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const digest = '0xABCDEF'
		const digestHash = await test.soliditySha3_sign(digest)
		const digestSignature = await getDigestSignature(digestHash, incorrectCard)
		
		const signature = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		try {
			await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestHash], {from: sponsor});
			assert(false, "transfer went through even though incorrect card")
		} catch(error) {
			assert(error.reason === 'Invalid address found when verifying signatures', error.reason)
		}
		
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened");
	});

	it("should fail a blank check transfer (from a 1 of 1 multisig with 2FA) if incorrect card", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const incorrectCard = accounts[42]
		const signersWithIncorrectCard = [signer, incorrectCard]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const digest = '0xABCDEF'
		const digestHash = await test.soliditySha3_sign(digest)
		const digestSignature = await getDigestSignature(digestHash, card)
		
		const signature = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		try {
			await zipperMS.redeemBlankCheck(addresses, signersWithIncorrectCard, m, signature.v, signature.r, signature.s, amount, [digestHash], {from: sponsor});
			assert(false, "transfer went through even though incorrect card")
		} catch(error) {
			assert(error.reason == 'Invalid address', error.reason)
		}
		
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened");
	});

	it("should fail a blank check transfer (from a 2 of 2 multisig with 2FA) if nonce is signed by incorrect card", async () => {
		const card2 = accounts[7]
		const incorrectCard = accounts[42]
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card2]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		// card 1
		const digest = '0xABCDEF'
		var digestHash = await test.soliditySha3_sign(digest)
		const digestSignature = await getDigestSignature(digestHash, incorrectCard)
		
		// card 2
		const digest2 = '0xFEDCBA'
		const digestHash2 = await test.soliditySha3_sign(digest2)
		const digestSignature2 = await getDigestSignature(digestHash2, card2)
		
		const v = [multisigSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v, recipientSignature.v]
		const r = [multisigSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf(), recipientSignature.r.valueOf()]
		const s = [multisigSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf(), recipientSignature.s.valueOf()]

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		const digestHashes = [digestHash, digestHash2]

		try {
			await zipperMS.redeemBlankCheck(addresses, signers, m, v, r, s, amount, digestHashes, {from: sponsor});
			assert(false, "transfer went through even though incorrect card!")
		} catch(error) {
			assert(error.reason === 'Invalid address found when verifying signatures', error.reason)
		}
	});

	it("should fail a blank check transfer (from a 2 of 2 multisig with 2FA) if incorrect card", async () => {
		const card2 = accounts[7]
		const incorrectCard = accounts[42]
		const signersWithIncorrectCard = [signer, card, incorrectCard]
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card2]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
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

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		const digestHashes = [digestHash, digestHash2]

		try {
			await zipperMS.redeemBlankCheck(addresses, signersWithIncorrectCard, m, v, r, s, amount, digestHashes, {from: sponsor});
			assert(false, "transfer went through even though incorrect card!")
		} catch(error) {
			assert(error.reason === 'Invalid address', error.reason)
		}
	});

	it("should fail a blank check transfer (1 signer, 1 card) if card nonce is being reused", async () => {
		var addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		var blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		var recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const digest = '0xABCDEF'
		const digestHash = await test.soliditySha3_sign(digest)
		const digestSignature = await getDigestSignature(digestHash, card)
		
		var signature = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)

		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestHash], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		// Try redeeming with same card nonce
		const verificationKey2 = accounts[7]
		addresses = [multisig, basicToken.address, recipient, verificationKey2]
		
		blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, "1")
		recipientSignature = await getRecipientSignature(recipient, verificationKey2)

		signature = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)
		
		try {
			await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestHash], {from: sponsor});
			assert(false, "Redeeming blank check should have failed because card nonce was reused!")
		} catch (error) {
			assert(error.reason == 'Card nonce reused', error.reason)
		}

		// Redeem with new card nonce
		const verificationKey3 = accounts[8]
		addresses = [multisig, basicToken.address, recipient, verificationKey3]
		
		blankCheckSignature = await getBlankCheckSignature(verificationKey3, signer, "1")
		recipientSignature = await getRecipientSignature(recipient, verificationKey3)

		const digest2 = '0xFEDCBA'
		const digestHash2 = await test.soliditySha3_sign(digest2)
		const digestSignature2 = await getDigestSignature(digestHash2, card)

		signature = getSignature(multisigSignature, blankCheckSignature, digestSignature2, recipientSignature)

		initialBalanceSender = await basicToken.balanceOf(multisig)
		initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey3) === false, "check already marked as cashed before transfer");
		
		await zipperMS.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestHash2], {from: sponsor});

		newBalanceSender = await basicToken.balanceOf(multisig)
		newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey3) === true, "check has not been marked as cashed after transfer");
	});

	it("should fail a blank check transfer (1 signer, 2 cards) if card nonce is reused", async () => {
		const card2 = accounts[7]
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
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

		const digestHashes = [digestHash, digestHash]

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		try {
			await zipperMS.redeemBlankCheck(addresses, signers, m, v, r, s, amount, digestHashes, {from: sponsor});
			assert(false, "transfer with duplicated card nonces went through, but should have failed!")
		} catch(error) {
			assert(error.reason === "Card nonce reused", error.reason)
		}	

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened");
	});

	it("should fail a blank check transfer (1 signer, 2 cards) if duplicated card is used", async () => {
		const card2 = accounts[7]
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
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

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		try {
			await zipperMS.redeemBlankCheck(addresses, signers, m, v, r, s, amount, digestHashes, {from: sponsor});
			assert(false, "transfer with duplicated card went through, but should have failed!")
		} catch(error) {
			assert(error.reason === "Invalid address found when verifying signatures", error.reason)
		}	

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened");
	});
});
