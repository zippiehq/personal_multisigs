const TestFunctions = artifacts.require("./TestFunctions.sol");
const BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
const ZippieWallet = artifacts.require("./ZippieWallet.sol");
const ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");
let test;

const {
	getMultisigSignature,
	getRecipientSignature,
	getSignature,
	getBlankCheckSignature,
	getDigestSignature,
	getHardcodedDigestSignature,
 } = require("./HelpFunctions");
 
contract("Test Zippie Multisig Check Cashing With Cards Error Cases", (accounts) => {

	let basicToken;
	let zippieCardNonces;
	let zippieWallet;

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
				basicToken = instance
				return ZippieCardNonces.new().then(instance => {
					zippieCardNonces = instance
					return ZippieWallet.new(zippieCardNonces.address)}).then(instance => {
						zippieWallet = instance;
						return basicToken.approve(zippieWallet.address, web3.utils.toWei("100", "ether"), {from: accounts[5]});
					});
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

		const digest = "0xABCDEF"
		const digestHash = await test.soliditySha3_sign(digest)
		const digestSignature = await getDigestSignature(digestHash, incorrectCard)
		
		const signature = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestHash], {from: sponsor});
			assert(false, "Transfer went through even though card signatures are missing")
		} catch(error) {
			assert(error.reason === "Invalid address found when verifying card signatures", error.reason)
		}
		
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened");
	});

	it("should fail a blank check transfer (from a 1 of 1 multisig with 2FA) if incorrect card", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const incorrectCard = accounts[42]
		const signersWithIncorrectCard = [signer, incorrectCard]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		try {
			await zippieWallet.redeemBlankCheck(addresses, signersWithIncorrectCard, m, signature.v, signature.r, signature.s, amount, [digestSignature.digestHash], {from: sponsor});
			assert(false, "transfer went through even though incorrect card")
		} catch(error) {
			assert(error.reason === "Invalid account", error.reason)
		}
		
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened");
	});

	it("should fail a blank check transfer (from a 2 of 2 multisig with 2FA) if nonce is signed by incorrect card", async () => {
		// card 1
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey
		
		// card 2
		const digestSignature2 = await getHardcodedDigestSignature(1, 0)
		const card2 = digestSignature.pubkey
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card2]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const v = [multisigSignature.v, recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v]
		const r = [multisigSignature.r.valueOf(), recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf()]
		const s = [multisigSignature.s.valueOf(), recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf()]

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		const digestHashes = [digestSignature.digestHash, digestSignature2.digestHash]

		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, v, r, s, amount, digestHashes, {from: sponsor});
			assert(false, "transfer went through even though incorrect card!")
		} catch(error) {
			assert(error.reason === "Invalid address found when verifying card signatures", error.reason)
		}
	});

	it("should fail a blank check transfer (from a 2 of 2 multisig with 2FA) if incorrect card", async () => {
		// card 1
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		// card 2
		const digestSignature2 = await getHardcodedDigestSignature(1, 0)
		const card2 = digestSignature2.pubkey

		const incorrectCard = accounts[42]
		const signersWithIncorrectCard = [signer, card, incorrectCard]
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card2]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const v = [multisigSignature.v, recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v]
		const r = [multisigSignature.r.valueOf(), recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf()]
		const s = [multisigSignature.s.valueOf(), recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf()]

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		const digestHashes = [digestSignature.digestHash, digestSignature2.digestHash]

		try {
			await zippieWallet.redeemBlankCheck(addresses, signersWithIncorrectCard, m, v, r, s, amount, digestHashes, {from: sponsor});
			assert(false, "transfer went through even though incorrect card!")
		} catch(error) {
			assert(error.reason === "Invalid account", error.reason)
		}
	});

	it("should fail a blank check transfer (1 signer, 1 card) if card nonce is being reused", async () => {
		// card 1
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]

		let multisigSignature = await getMultisigSignature(signers, m, multisig)
		let blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		let recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)

		let initialBalanceSender = await basicToken.balanceOf(multisig)
		let initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestSignature.digestHash], {from: sponsor});

		let newBalanceSender = await basicToken.balanceOf(multisig)
		let newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		// Try redeeming with same card nonce
		const verificationKey2 = accounts[7]
		const addresses2 = [multisig, basicToken.address, recipient, verificationKey2]
		
		blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, "1")
		recipientSignature = await getRecipientSignature(recipient, verificationKey2)

		const signature2 = getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature)
		
		try {
			await zippieWallet.redeemBlankCheck(addresses2, signers, m, signature2.v, signature2.r, signature2.s, amount, [digestSignature.digestHash], {from: sponsor});
			assert(false, "Redeeming blank check should have failed because card nonce was reused!")
		} catch (error) {
			assert(error.reason === "Nonce already used", error.reason)
		}

		// Redeem with new card nonce
		
		// card 2
		const digestSignature2 = await getHardcodedDigestSignature(1, 0)
		const card2 = digestSignature2.pubkey
		
		const verificationKey3 = accounts[8]
		const addresses3 = [multisig, basicToken.address, recipient, verificationKey3]
		const signers2 = [signer, card2]
		
		multisigSignature = await getMultisigSignature(signers2, m, multisig)
		blankCheckSignature = await getBlankCheckSignature(verificationKey3, signer, "1")
		recipientSignature = await getRecipientSignature(recipient, verificationKey3)

		const signature3 = getSignature(multisigSignature, blankCheckSignature, digestSignature2, recipientSignature)

		initialBalanceSender = await basicToken.balanceOf(multisig)
		initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey3) === false, "check already marked as cashed before transfer");
		
		await zippieWallet.redeemBlankCheck(addresses3, signers2, m, signature3.v, signature3.r, signature3.s, amount, [digestSignature2.digestHash], {from: sponsor});

		newBalanceSender = await basicToken.balanceOf(multisig)
		newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey3) === true, "check has not been marked as cashed after transfer");
	});

	it("should fail a blank check transfer (1 signer, 2 cards) if card nonce is reused", async () => {
		// card 1
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		// card 2
		const digestSignature2 = await getHardcodedDigestSignature(1, 0)
		const card2 = digestSignature2.pubkey
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card2]

		let multisigSignature = await getMultisigSignature(signers, m, multisig)
		let blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		let recipientSignature = await getRecipientSignature(recipient, verificationKey)

		let v = [multisigSignature.v, recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v]
		let r = [multisigSignature.r.valueOf(), recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf()]
		let s = [multisigSignature.s.valueOf(), recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf()]

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		const digestHashes = [digestSignature.digestHash, digestSignature2.digestHash]
		await zippieWallet.redeemBlankCheck(addresses, signers, m, v, r, s, amount, digestHashes, {from: sponsor});

		let newBalanceSender = await basicToken.balanceOf(multisig)
		let newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		// Try redeeming with same card nonce
		const verificationKey2 = accounts[7]
		const addresses2 = [multisig, basicToken.address, recipient, verificationKey2]
		
		blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, "1")
		recipientSignature = await getRecipientSignature(recipient, verificationKey2)

		v = [multisigSignature.v, recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v]
		r = [multisigSignature.r.valueOf(), recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf()]
		s = [multisigSignature.s.valueOf(), recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf()]
		
		try {
			await zippieWallet.redeemBlankCheck(addresses2, signers, m, v, r, s, amount, digestHashes, {from: sponsor});
			assert(false, "Redeeming blank check should have failed because card nonce was reused!")
		} catch (error) {
			assert(error.reason === "Nonce already used", error.reason)
		}
	});

	it("should fail a blank check transfer (1 signer, 2 cards) if duplicated card is used", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const v = [multisigSignature.v, recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature.v]
		const r = [multisigSignature.r.valueOf(), recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature.r.valueOf()]
		const s = [multisigSignature.s.valueOf(), recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature.s.valueOf()]

		const digestHashes = [digestSignature.digestHash, digestSignature.digestHash]

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, v, r, s, amount, digestHashes, {from: sponsor});
			assert(false, "transfer with duplicated card went through, but should have failed!")
		} catch(error) {
			assert(error.reason === "Card address has been used already", error.reason)
		}	

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened");
	});
});