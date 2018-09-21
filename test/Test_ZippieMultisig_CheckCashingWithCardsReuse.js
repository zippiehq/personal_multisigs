var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");
var test;

contract("Test Zippie Multisig Reuse Card Nonces", (accounts) => {
	
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

	it("should deny a blank check to be cashed if card nonce is being reused", async () => {
		var addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		var blankCheckSignature = await getBlankCheckSignature(verificationKey, signer)
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
		
		blankCheckSignature = await getBlankCheckSignature(verificationKey2, signer)
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
		
		blankCheckSignature = await getBlankCheckSignature(verificationKey3, signer)
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
});

function log(msg) {
	console.log(msg)
}

function getRSV(str) {
	return {r:'0x' + str.slice(0,64), s: '0x' + str.slice(64,128), v: web3.utils.hexToNumber(str.slice(128,130)) + 27 };
}

async function getMultisigSignature(signers, m, multisig) {
	const multisigHash = await test.soliditySha3_addresses_m(signers, m);
	const multisigSignature = await web3.eth.sign(multisigHash, multisig);
	return getRSV(multisigSignature.slice(2))
}

async function getBlankCheckSignature(verificationKey, signer) {
	// sign by multisig signer
	const blankCheckHash = await test.soliditySha3_amount_address(web3.utils.toWei("1", "ether"), verificationKey);
	const blankCheckSignature = await web3.eth.sign(blankCheckHash, signer);
	return getRSV(blankCheckSignature.slice(2))
}

async function getRecipientSignature(recipient, verificationKey) {
	// sign by a random verification key
	const recipientHash = await test.soliditySha3_address(recipient);
	const recipientSignature = await web3.eth.sign(recipientHash, verificationKey);
	return getRSV(recipientSignature.slice(2))
}

async function getDigestSignature(digestHash, card) {
	const digestSignature = await web3.eth.sign(digestHash, card);
	return getRSV(digestSignature.slice(2))
}

function getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature) {
	const v = [multisigSignature.v, blankCheckSignature.v, digestSignature.v, recipientSignature.v]
	const r = [multisigSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), recipientSignature.r.valueOf()]
	const s = [multisigSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), recipientSignature.s.valueOf()]

	return {v:v, r:r, s:s}
}