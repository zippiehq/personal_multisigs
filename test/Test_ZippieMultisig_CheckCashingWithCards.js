var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWallet.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");
var test;

const {
	getMultisigSignature,
	getRecipientSignature,
	getSignature,
	getBlankCheckSignature,
	getNonceSignature,
	getSetLimitSignature,
	getDigestSignature,
	getSignatureFrom3,
	getEmptyDigestSignature,
	getHardcodedDigestSignature,
	getRSV,
	log,
 } = require("./HelpFunctions");

contract("Test Zippie Multisig Check Cashing With Cards Functionality", (accounts) => {

	var basicToken;
	var zippieCardNonces;
	var zippieWallet;

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
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [digestSignature.digestHash], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

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
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zippieWallet.redeemBlankCheck(addresses, signers, m, v, r, s, amount, digestHashes, {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");
	});

	it("should set limit to 5 ether", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		card = digestSignature.pubkey
		
		var addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const limit = "5"
		
		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		var addressesLimit = [multisig, verificationKey]
		const limitSignature = await getSetLimitSignature(verificationKey, signer, limit)
		const nonceSignature = await getNonceSignature(multisig, verificationKey)
		
		const signature = getSignature(multisigSignature, limitSignature, digestSignature, nonceSignature)
		const amount = web3.utils.toWei(limit, "ether")
		await zippieWallet.setLimit(addressesLimit, signers, m, signature.v, signature.r, signature.s, amount, [digestSignature.digestHash], {from: sponsor});
		
		var newLimit = await zippieWallet.accountLimits(addresses[0])
		assert(parseInt(newLimit, 10).toString() === amount, "limit was not set");
	});

	it("should allow to decrease limit without card signatures", async () => {
		// TODO
	});

	it("should not allow to increase limit without card signatures", async () => {
		// TODO
	});

	it("should allow to increase limit with card signatures", async () => {
		// TODO
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig with 2FA, without checking 2FA because under account limit", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		card = digestSignature.pubkey
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		var addressesLimit = [multisig, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const limitValue = "2"
		const amountValue = "1"
		
		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const limitSignature = await getSetLimitSignature(verificationKey, signer, limitValue)
		const nonceSignature = await getNonceSignature(multisig, verificationKey)
		
		const signatureForLimit = getSignature(multisigSignature, limitSignature, digestSignature, nonceSignature)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		
		const limit = web3.utils.toWei(limitValue, "ether")
		await zippieWallet.setLimit(addressesLimit, signers, m, signatureForLimit.v, signatureForLimit.r, signatureForLimit.s, limit, [digestSignature.digestHash], {from: sponsor});
		const accountLimit = await zippieWallet.accountLimits(multisig)
		assert(accountLimit.toString() === limit.toString(), "limit was not set correctly")
		
		const verificationKey2 = accounts[11] // random verification key		
		const addresses2 = [multisig, basicToken.address, recipient, verificationKey2]
		const blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, amountValue)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey2)
		const signature = getSignatureFrom3(multisigSignature, blankCheckSignature, recipientSignature)
		const amount = web3.utils.toWei(amountValue, "ether")
		// Skipping card signatures, since it should work without because we are under account limit
		await zippieWallet.redeemBlankCheck(addresses2, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey2) === true, "check has not been marked as cashed after transfer");
	});

	it("should prevent a blank check to be cashed once from a 1 of 1 multisig with 2FA, when amount is over account limit but card signatures is incorrect", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		card = digestSignature.pubkey
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const addressesLimit = [multisig, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const limitValue = "1"
		const amountValue = "2"
		
		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const limitSignature = await getSetLimitSignature(verificationKey, signer, limitValue)
		const nonceSignature = await getNonceSignature(multisig, verificationKey)
		
		const signatureForLimit = getSignature(multisigSignature, limitSignature, digestSignature, nonceSignature)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const limit = web3.utils.toWei(limitValue, "ether")
		await zippieWallet.setLimit(addressesLimit, signers, m, signatureForLimit.v, signatureForLimit.r, signatureForLimit.s, limit, [digestSignature.digestHash], {from: sponsor});
		const accountLimit = await zippieWallet.accountLimits(multisig)
		assert(accountLimit.toString() === limit.toString(), "limit was not set correctly")
		
		const verificationKey2 = accounts[11] // random verification key		
		const addresses2 = [multisig, basicToken.address, recipient, verificationKey2]
		const blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, amountValue)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey2)
		const emptyDigestSignature = getEmptyDigestSignature()
		const signature = getSignature(multisigSignature, blankCheckSignature, emptyDigestSignature, recipientSignature)
		const amount = web3.utils.toWei(amountValue, "ether")
		
		try {
			// Skipping card signatures, which should fail
			await zippieWallet.redeemBlankCheck(addresses2, signers, m, signature.v, signature.r, signature.s, amount, [emptyDigestSignature.digestHash], {from: sponsor});
			assert(false, "Transfer went through even though card signatures are missing")
		} catch (error) {
			assert(error.reason === "Invalid address found when verifying card signatures", error.reason)
		}
	});

	it("should prevent a blank check to be cashed once from a 1 of 1 multisig with 2FA, when amount is over account limit but card signatures is missing", async () => {
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		card = digestSignature.pubkey
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const addressesLimit = [multisig, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const limitValue = "1"
		const amountValue = "2"
		
		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const limitSignature = await getSetLimitSignature(verificationKey, signer, limitValue)
		const nonceSignature = await getNonceSignature(multisig, verificationKey)
		
		const signatureForLimit = getSignature(multisigSignature, limitSignature, digestSignature, nonceSignature)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const limit = web3.utils.toWei(limitValue, "ether")
		await zippieWallet.setLimit(addressesLimit, signers, m, signatureForLimit.v, signatureForLimit.r, signatureForLimit.s, limit, [digestSignature.digestHash], {from: sponsor});
		const accountLimit = await zippieWallet.accountLimits(multisig)
		assert(accountLimit.toString() === limit.toString(), "limit was not set correctly")
		
		const verificationKey2 = accounts[11] // random verification key		
		const addresses2 = [multisig, basicToken.address, recipient, verificationKey2]
		const blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, amountValue)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey2)
		const signature = getSignatureFrom3(multisigSignature, blankCheckSignature, recipientSignature)
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
		const digestSignature = await getHardcodedDigestSignature(0, 0)
		card = digestSignature.pubkey
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const addressesLimit = [multisig, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const limitValue = "1"
		const amountValue = "2"
		
		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const limitSignature = await getSetLimitSignature(verificationKey, signer, limitValue)
		const nonceSignature = await getNonceSignature(multisig, verificationKey)
		
		const signatureForLimit = getSignature(multisigSignature, limitSignature, digestSignature, nonceSignature)
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const limit = web3.utils.toWei(limitValue, "ether")
		await zippieWallet.setLimit(addressesLimit, signers, m, signatureForLimit.v, signatureForLimit.r, signatureForLimit.s, limit, [digestSignature.digestHash], {from: sponsor});
		
		const digestSignature2 = await getHardcodedDigestSignature(1, 0)
		const card2 = digestSignature2.pubkey
		const verificationKey2 = accounts[11] // random verification key		
		const addresses2 = [multisig, basicToken.address, recipient, verificationKey2]
		const signers2 = [signer, card2]
		const multisigSignature2 = await getMultisigSignature(signers2, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer, amountValue)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey2)
		const signature = getSignature(multisigSignature2, blankCheckSignature, digestSignature2, recipientSignature)
		const amount = web3.utils.toWei(amountValue, "ether")
		await zippieWallet.redeemBlankCheck(addresses2, signers2, m, signature.v, signature.r, signature.s, amount, [digestSignature2.digestHash], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey2) === true, "check has not been marked as cashed after transfer");
	});
});