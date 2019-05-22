const TestFunctions = artifacts.require("./TestFunctions.sol");
const BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
const ZippieWallet = artifacts.require("./ZippieWalletERC20.sol");
const ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const {
	getAccountAddress,
	getRecipientSignature,
	getSignature,
	getBlankCheckSignature,
	getNonceSignature,
	getSetLimitSignature,
	getSignatureNoCard,
	getEmptyDigestSignature,
	getHardcodedDigestSignature,
 } = require("./HelpFunctions");

contract("Test Zippie Multisig Check Cashing With Cards Functionality", (accounts) => {

	let basicToken;
	let zippieCardNonces;
	let zippieWallet;

	const signer = accounts[0] // multisig signer (1of1)
	const recipient = accounts[2]
	const verificationKey = accounts[4] // random verification key
	const sponsor = accounts[6] // Zippie PMG server

	beforeEach(() => {
	return TestFunctions.new().then(_ => {
		return BasicERC20Mock.new(sponsor).then(instance => {
			basicToken = instance
			return ZippieCardNonces.new().then(instance => {
				zippieCardNonces = instance
				return ZippieWallet.new(zippieCardNonces.address)}).then(instance => {
					zippieWallet = instance;
				});
			});
		});
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig with 2FA, and fail the second time", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const multisig = await getAccountAddress(signers, m, basicToken.address, zippieWallet.address)
		await basicToken.transfer(multisig, web3.utils.toWei("100", "ether"), {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1", addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)
		
		const signature = getSignature(blankCheckSignature, digestSignature, recipientSignature)

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		assert(await zippieCardNonces.isNonceUsed(card, digestSignature.digestHash) === false, "card nonce already used before transfer");

		const amount = web3.utils.toWei("1", "ether")
		await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestSignature.digestHash], {from: sponsor});

		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");
		assert(await zippieCardNonces.isNonceUsed(card, digestSignature.digestHash) === true, "card nonce not marked as used after transfer");

		try {
			// try the same exact transfer
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestSignature.digestHash], {from: sponsor});
			assert(false, "duplicate transfer went through, but should have failed!")
		} catch(error) {
			assert(error.reason === "Nonce already used", error.reason)
		}
	});

	it("should allow a blank check to be cashed when using two cards", async () => {
		// card 1
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey

		// card 2
		const digestSignature2 = await getHardcodedDigestSignature(1, 0)
		const card2 = digestSignature2.pubkey
		
		const signers = [signer, card, card2]
		const m = [1, 1, 2, 2]
		const multisig = await getAccountAddress(signers, m, basicToken.address, zippieWallet.address)
		await basicToken.transfer(multisig, web3.utils.toWei("100", "ether"), {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1", addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const v = [recipientSignature.v, blankCheckSignature.v, digestSignature.v, digestSignature2.v]
		const r = [recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), digestSignature2.r.valueOf()]
		const s = [recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), digestSignature2.s.valueOf()]

		const digestHashes = [digestSignature.digestHash, digestSignature2.digestHash]

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		assert(await zippieCardNonces.isNonceUsed(card, digestSignature.digestHash) === false, "card nonce already used before transfer");
		assert(await zippieCardNonces.isNonceUsed(card2, digestSignature2.digestHash) === false, "card nonce already used before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zippieWallet.redeemBlankCheck(addresses, signers, m, v, r, s, amount, digestHashes, {from: sponsor});

		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");
		assert(await zippieCardNonces.isNonceUsed(card, digestSignature.digestHash) === true, "card nonce not marked as used after transfer");
		assert(await zippieCardNonces.isNonceUsed(card2, digestSignature2.digestHash) === true, "card nonce not marked as used after transfer");		
	});

	it("should set limit to 5 ether", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey
		
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const multisig = await getAccountAddress(signers, m, basicToken.address, zippieWallet.address)
		await basicToken.transfer(multisig, web3.utils.toWei("100", "ether"), {from: sponsor});

		const limit = "5"
		
		const addressesLimit = [verificationKey]
		const limitSignature = await getSetLimitSignature(verificationKey, signer, limit)
		const nonceSignature = await getNonceSignature(multisig, verificationKey)
		
		const signature = getSignature(limitSignature, digestSignature, nonceSignature)
		const amount = web3.utils.toWei(limit, "ether")
		await zippieWallet.setLimit(addressesLimit, signers, m, signature.v, signature.r, signature.s, amount, [digestSignature.digestHash], {from: sponsor});
		
		const newLimit = await zippieWallet.accountLimits(multisig)
		assert(parseInt(newLimit, 10).toString() === amount, "limit was not set");
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig with 2FA, without checking 2FA because under account limit", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey
		
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const multisig = await getAccountAddress(signers, m, basicToken.address, zippieWallet.address)
		await basicToken.transfer(multisig, web3.utils.toWei("100", "ether"), {from: sponsor});
		const addressesLimit = [verificationKey]

		const limitValue = "2"
		const amountValue = "1"
		
		const limitSignature = await getSetLimitSignature(verificationKey, signer, limitValue)
		const nonceSignature = await getNonceSignature(multisig, verificationKey)
		
		const signatureForLimit = getSignature(limitSignature, digestSignature, nonceSignature)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		
		const limit = web3.utils.toWei(limitValue, "ether")
		await zippieWallet.setLimit(addressesLimit, signers, m, signatureForLimit.v, signatureForLimit.r, signatureForLimit.s, limit, [digestSignature.digestHash], {from: sponsor});
		const accountLimit = await zippieWallet.accountLimits(multisig)
		assert(accountLimit.toString() === limit.toString(), "limit was not set correctly")
		
		const verificationKey2 = accounts[11] // random verification key		
		const addresses2 = [basicToken.address, recipient, verificationKey2]
		const blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, amountValue, addresses2[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey2)
		const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)
		const amount = web3.utils.toWei(amountValue, "ether")
		// Skipping card signatures, since it should work without because we are under account limit
		await zippieWallet.redeemBlankCheck(addresses2, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});

		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey2) === true, "check has not been marked as cashed after transfer");
	});

	it("should prevent a blank check to be cashed once from a 1 of 1 multisig with 2FA, when amount is over account limit but card signatures is incorrect", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey
		
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const multisig = await getAccountAddress(signers, m, basicToken.address, zippieWallet.address)
		await basicToken.transfer(multisig, web3.utils.toWei("100", "ether"), {from: sponsor});
		const addressesLimit = [verificationKey]

		const limitValue = "1"
		const amountValue = "2"
		
		const limitSignature = await getSetLimitSignature(verificationKey, signer, limitValue)
		const nonceSignature = await getNonceSignature(multisig, verificationKey)
		
		const signatureForLimit = getSignature(limitSignature, digestSignature, nonceSignature)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const limit = web3.utils.toWei(limitValue, "ether")
		await zippieWallet.setLimit(addressesLimit, signers, m, signatureForLimit.v, signatureForLimit.r, signatureForLimit.s, limit, [digestSignature.digestHash], {from: sponsor});
		const accountLimit = await zippieWallet.accountLimits(multisig)
		assert(accountLimit.toString() === limit.toString(), "limit was not set correctly")
		
		const verificationKey2 = accounts[11] // random verification key		
		const addresses = [basicToken.address, recipient, verificationKey2]
		const blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, amountValue, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey2)
		const emptyDigestSignature = getEmptyDigestSignature()
		const signature = getSignature(blankCheckSignature, emptyDigestSignature, recipientSignature)
		const amount = web3.utils.toWei(amountValue, "ether")
		
		try {
			// Skipping card signatures, which should fail
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [emptyDigestSignature.digestHash], {from: sponsor});
			assert(false, "Transfer went through even though card signatures are missing")
		} catch (error) {
			assert(error.reason === "Invalid address found when verifying card signatures", error.reason)
		}
	});

	it("should prevent a blank check to be cashed once from a 1 of 1 multisig with 2FA, when amount is over account limit but card signatures is missing", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		const card = digestSignature.pubkey
		
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const multisig = await getAccountAddress(signers, m, basicToken.address, zippieWallet.address)
		await basicToken.transfer(multisig, web3.utils.toWei("100", "ether"), {from: sponsor});
		const addressesLimit = [verificationKey]

		const limitValue = "1"
		const amountValue = "2"
		
		const limitSignature = await getSetLimitSignature(verificationKey, signer, limitValue)
		const nonceSignature = await getNonceSignature(multisig, verificationKey)
		
		const signatureForLimit = getSignature(limitSignature, digestSignature, nonceSignature)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const limit = web3.utils.toWei(limitValue, "ether")
		await zippieWallet.setLimit(addressesLimit, signers, m, signatureForLimit.v, signatureForLimit.r, signatureForLimit.s, limit, [digestSignature.digestHash], {from: sponsor});
		const accountLimit = await zippieWallet.accountLimits(multisig)
		assert(accountLimit.toString() === limit.toString(), "limit was not set correctly")
		
		const verificationKey2 = accounts[11] // random verification key		
		const addresses2 = [basicToken.address, recipient, verificationKey2]
		const blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, amountValue, addresses2[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey2)
		const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)
		const amount = web3.utils.toWei(amountValue, "ether")
		
		try {
			// Skipping card signatures, which should fail
			await zippieWallet.redeemBlankCheck(addresses2, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "Transfer went through even though card signatures are missing")
		} catch (error) {
			assert(error.reason === "Incorrect number of signatures (v)", error.reason)
		}
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig with 2FA, although amount is over account limit", async () => {
		const digestSignature = await getHardcodedDigestSignature(1, 0)
		const card = digestSignature.pubkey
		
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const multisig = await getAccountAddress(signers, m, basicToken.address, zippieWallet.address)
		await basicToken.transfer(multisig, web3.utils.toWei("100", "ether"), {from: sponsor});
		const addressesLimit = [verificationKey]

		const limitValue = "1"
		const amountValue = "2"
		
		const limitSignature = await getSetLimitSignature(verificationKey, signer, limitValue)
		const nonceSignature = await getNonceSignature(multisig, verificationKey)
		
		const signatureForLimit = getSignature(limitSignature, digestSignature, nonceSignature)
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const limit = web3.utils.toWei(limitValue, "ether")
		await zippieWallet.setLimit(addressesLimit, signers, m, signatureForLimit.v, signatureForLimit.r, signatureForLimit.s, limit, [digestSignature.digestHash], {from: sponsor});
		
		const digestSignature2 = await getHardcodedDigestSignature(1, 1)
		const card2 = digestSignature2.pubkey
		const verificationKey2 = accounts[11] // random verification key		
		const addresses2 = [basicToken.address, recipient, verificationKey2]
		const signers2 = [signer, card2]
		const blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, amountValue, addresses2[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey2)
		const signature = getSignature(blankCheckSignature, digestSignature2, recipientSignature)
		const amount = web3.utils.toWei(amountValue, "ether")
		await zippieWallet.redeemBlankCheck(addresses2, signers2, m, signature.v, signature.r, signature.s, amount, [digestSignature2.digestHash], {from: sponsor});

		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey2) === true, "check has not been marked as cashed after transfer");
	});
});