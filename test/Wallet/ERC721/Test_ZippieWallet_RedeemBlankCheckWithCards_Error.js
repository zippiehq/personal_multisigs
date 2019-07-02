const BasicERC721Mock = artifacts.require("./BasicERC721Mock.sol");
const ZippieWallet = artifacts.require("./ZippieWalletERC721.sol");
const ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const {
	getAccountAddress,
	getRecipientSignature,
	getSignature,
	getBlankCheckSignature,
	getDigestSignature,
	getHardcodedDigestSignature,
	soliditySha3_sign,
 } = require("./HelpFunctions");
 
contract("Test Zippie Multisig Check Cashing With Cards Error Cases", (accounts) => {

	let basicToken;
	let zippieCardNonces;
	let zippieWallet;

	const signer = accounts[0] // multisig signer (1of1)
	const recipient = accounts[2]
	const card = accounts[3]
	const verificationKey = accounts[4] // random verification key
	const sponsor = accounts[6] // Zippie PMG server

	beforeEach(() => {
		return BasicERC721Mock.new(sponsor).then(instance => {
			basicToken = instance;
			return ZippieCardNonces.new().then(instance => {
				zippieCardNonces = instance
				return ZippieWallet.new(zippieCardNonces.address).then(instance => {
					zippieWallet = instance;
				});
			});
		});
	});

	it("should fail a blank check transfer (from a 1 of 1 multisig with 2FA) if nonce is signed by incorrect card", async () => {
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]
		
		const incorrectCard = accounts[42]

		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const digest = "0xABCDEF"
		const digestHash = soliditySha3_sign(digest)
		const digestSignature = await getDigestSignature(digestHash, incorrectCard)
		
		const signature = getSignature(blankCheckSignature, digestSignature, recipientSignature)

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [digestHash], {from: sponsor});
			assert(false, "Transfer went through even though card signatures are missing")
		} catch(error) {
			assert(error.reason === "Invalid address found when verifying card signatures", error.reason)
		}
		
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened");
	});

	it("should fail a blank check transfer (from a 1 of 1 multisig with 2FA) if incorrect card", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]

		const incorrectCard = accounts[42]
		const signersWithIncorrectCard = [signer, incorrectCard]

		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(blankCheckSignature, digestSignature, recipientSignature)

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		try {
			await zippieWallet.redeemBlankCheck(addresses, signersWithIncorrectCard, m, signature.v, signature.r, signature.s, tokenId, [digestSignature.digestHash], {from: sponsor});
			assert(false, "transfer went through even though incorrect card")
		} catch(error) {
			assert(error.reason === "Invalid address found when verifying card signatures", error.reason)
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
		
		const signers = [signer, card, card2]
		const m = [1, 1, 2, 2]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const v = [recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v]
		const r = [recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf()]
		const s = [recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf()]

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const digestHashes = [digestSignature.digestHash, digestSignature2.digestHash]

		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, v, r, s, tokenId, digestHashes, {from: sponsor});
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
		
		const signers = [signer, card, card2]
		const m = [1, 1, 2, 2]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const v = [recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v]
		const r = [recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf()]
		const s = [recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf()]

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const digestHashes = [digestSignature.digestHash, digestSignature2.digestHash]

		try {
			await zippieWallet.redeemBlankCheck(addresses, signersWithIncorrectCard, m, v, r, s, tokenId, digestHashes, {from: sponsor});
			assert(false, "transfer went through even though incorrect card!")
		} catch(error) {
			assert(error.reason === "Invalid address found when verifying card signatures", error.reason)
		}
	});

	it("should fail a blank check transfer (1 signer, 1 card) if card nonce is being reused", async () => {
		// card 1
		const digestSignature = await getHardcodedDigestSignature(1, 0)
		const card = digestSignature.pubkey

		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]

		let blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, tokenId, addresses[0])
		let recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(blankCheckSignature, digestSignature, recipientSignature)

		let initialBalanceSender = await basicToken.balanceOf(multisig)
		let initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [digestSignature.digestHash], {from: sponsor});
		
		const amount = "1"
		let newBalanceSender = await basicToken.balanceOf(multisig)
		let newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "token did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "token did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		// Try redeeming with same card nonce
		const verificationKey2 = accounts[7]
		const addresses2 = [basicToken.address, recipient, verificationKey2]
		
		blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, tokenId, addresses[0])
		recipientSignature = await getRecipientSignature(recipient, verificationKey2)

		const signature2 = getSignature(blankCheckSignature, digestSignature, recipientSignature)
		
		try {
			await zippieWallet.redeemBlankCheck(addresses2, signers, m, signature2.v, signature2.r, signature2.s, tokenId, [digestSignature.digestHash], {from: sponsor});
			assert(false, "Redeeming blank check should have failed because card nonce was reused!")
		} catch (error) {
			assert(error.reason === "Card nonce already used", error.reason)
		}

		// Redeem with new card nonce
		
		// card 2
		const digestSignature2 = await getHardcodedDigestSignature(1, 1)
		const card2 = digestSignature2.pubkey
		
		const verificationKey3 = accounts[8]
		const addresses3 = [basicToken.address, recipient, verificationKey3]
		const signers2 = [signer, card2]

		const tokenId2 = "2"
		await basicToken.transferFrom(sponsor, multisig, tokenId2, {from: sponsor});
		
		blankCheckSignature = await getBlankCheckSignature(verificationKey3, signer, tokenId2, addresses[0])
		recipientSignature = await getRecipientSignature(recipient, verificationKey3)

		const signature3 = getSignature(blankCheckSignature, digestSignature2, recipientSignature)

		const amount2 = "1"
		initialBalanceSender = await basicToken.balanceOf(multisig)
		initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey3) === false, "check already marked as cashed before transfer");
		
		await zippieWallet.redeemBlankCheck(addresses3, signers2, m, signature3.v, signature3.r, signature3.s, tokenId2, [digestSignature2.digestHash], {from: sponsor});

		newBalanceSender = await basicToken.balanceOf(multisig)
		newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount2, "token did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount2, "token did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey3) === true, "check has not been marked as cashed after transfer");
	});

	it("should fail a blank check transfer (1 signer, 2 cards) if card nonce is reused", async () => {
		// card 1
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		// card 2
		const digestSignature2 = await getHardcodedDigestSignature(1, 0)
		const card2 = digestSignature2.pubkey
		
		const signers = [signer, card, card2]
		const m = [1, 1, 2, 2]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]

		let blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, tokenId, addresses[0])
		let recipientSignature = await getRecipientSignature(recipient, verificationKey)

		let v = [recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v]
		let r = [recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf()]
		let s = [recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf()]

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const digestHashes = [digestSignature.digestHash, digestSignature2.digestHash]
		await zippieWallet.redeemBlankCheck(addresses, signers, m, v, r, s, tokenId, digestHashes, {from: sponsor});
		
		const amount = "1"
		let newBalanceSender = await basicToken.balanceOf(multisig)
		let newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "token did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "token did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		// Try redeeming with same card nonce
		const verificationKey2 = accounts[7]
		const addresses2 = [basicToken.address, recipient, verificationKey2]
		
		blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, tokenId, addresses[0])
		recipientSignature = await getRecipientSignature(recipient, verificationKey2)

		v = [recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v]
		r = [recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf()]
		s = [recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf()]
		
		try {
			await zippieWallet.redeemBlankCheck(addresses2, signers, m, v, r, s, tokenId, digestHashes, {from: sponsor});
			assert(false, "Redeeming blank check should have failed because card nonce was reused!")
		} catch (error) {
			assert(error.reason === "Card nonce already used", error.reason)
		}
	});

	it("should fail a blank check transfer (1 signer, 2 cards) if duplicated card is used", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		const signers = [signer, card, card]
		const m = [1, 1, 2, 2]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const v = [recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature.v]
		const r = [recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature.r.valueOf()]
		const s = [recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature.s.valueOf()]

		const digestHashes = [digestSignature.digestHash, digestSignature.digestHash]

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, v, r, s, tokenId, digestHashes, {from: sponsor});
			assert(false, "transfer with duplicated card went through, but should have failed!")
		} catch(error) {
			assert(error.reason === "Card address has been used already", error.reason)
		}	

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check marked as cashed even though no transfer happened");
	});

	it("should fail a blank check transfer (from a 1 of 1 multisig with 2FA) if multisig is not owner of tokenId", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(blankCheckSignature, digestSignature, recipientSignature)

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const ownerOfToken1 = await basicToken.ownerOf("1")
		assert(ownerOfToken1.toLowerCase() !== multisig, "initial owner of token 1 is incorrect")

		try {
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [digestSignature.digestHash], {from: sponsor});
			assert(false, "transfer went through, but should have failed since token sender is not owner")
		} catch (error) {
			// ERC20 will throw error here but there's no revert reason, otherwise it would have gotten propogated here
			assert(error.message.includes("VM Exception"), error.message)
		}

		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check was incorrectly marked as cashed after failed transfer");
	});
});