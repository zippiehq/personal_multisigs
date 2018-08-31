var BasicERC20 = artifacts.require("./BasicERC20.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");

contract("Test Zippie Multisig Check Cashing With Cards Functionality", (accounts) => {

	var basicToken;
	var zipperMS;

	beforeEach( () => {
    	return BasicERC20.new(accounts[5]).then( (instance) => {
    		basicToken = instance;
    		return ZippieMultisigWallet.new();
     	}).then( (instance) => {
     		zipperMS = instance;
     		return basicToken.approve(instance.address, web3.toWei(100, "ether"), {from: accounts[5]});
     	});
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig with 2FA, and fail the second time", async () => {
		const signer = accounts[0] // multisig signer (1of1)
		const recipient = accounts[2]
		const card = accounts[3]
		const verificationKey = accounts[4] // random verification key
		const multisig = accounts[5] // multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
		const sponsor = accounts[6] // Zippie PMG server
		
		const m = [1, 1, 1, 1]

		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m_cards([signer, card], m);
		var signedByPrivateKey = web3.eth.sign(multisig, signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// sign by multisig signer
		var signByKey1 = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), verificationKey);
		var signedByKey1 = web3.eth.sign(signer, signByKey1).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		// sign by a random verification key
		var signByVerification = await zipperMS.soliditySha3_address(recipient);
		var signedByVerification = web3.eth.sign(verificationKey, signByVerification).slice(2);

		var r2 = '0x' + signedByVerification.slice(0,64);
		var s2 = '0x' + signedByVerification.slice(64,128);
		var v2 = web3.toDecimal(signedByVerification.slice(128,130)) + 27;

		const digest = '0xABCDEF'
		var signByCard = await zipperMS.soliditySha3_sign(digest)
		var signedByCard = web3.eth.sign(card, signByCard).slice(2);
		
		var rCard = '0x' + signedByCard.slice(0,64);
		var sCard = '0x' + signedByCard.slice(64,128);
		var vCard = web3.toDecimal(signedByCard.slice(128,130)) + 27;

		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		await zipperMS.checkAndTransferFrom_BlankCheck_Card([multisig, basicToken.address, recipient, verificationKey], [signer, card], m, [v0, v1, vCard, v2], [r0.valueOf(), r1.valueOf(), rCard.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), sCard.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), [signByCard], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert(initialBalanceSender.minus(newBalanceSender).toString() === web3.toWei(1, "ether"), "balance did not transfer from sender");
		assert(newBalanceRecipient.minus(initialBalanceRecipient).toString() === web3.toWei(1, "ether"), "sssssssssssssssssssssssssbalance did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try {
			// try the same exact transfer
			await zipperMS.checkAndTransferFrom_BlankCheck_Card([multisig, basicToken.address, recipient, verificationKey], [signer, card], m, [v0, v1, vCard, v2], [r0.valueOf(), r1.valueOf(), rCard.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), sCard.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), [signByCard], {from: sponsor});
			assert(false, "duplicate transfer went through, but should have failed!")
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', error.message)
		}
	});

	it("should allow a blank check to be cashed once even if no card is required, and fail the second time", async () => {
		const signer = accounts[0] // multisig signer (1of1)
		const recipient = accounts[2]
		const card = accounts[3]
		const verificationKey = accounts[4] // random verification key
		const multisig = accounts[5] // multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
		const sponsor = accounts[6] // Zippie PMG server
		
		const m = [1, 1, 0, 0]

		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m_cards([signer], m);
		var signedByPrivateKey = web3.eth.sign(multisig, signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// sign by multisig signer
		var signByKey1 = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), verificationKey);
		var signedByKey1 = web3.eth.sign(signer, signByKey1).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		// sign by a random verification key
		var signByVerification = await zipperMS.soliditySha3_address(recipient);
		var signedByVerification = web3.eth.sign(verificationKey, signByVerification).slice(2);

		var r2 = '0x' + signedByVerification.slice(0,64);
		var s2 = '0x' + signedByVerification.slice(64,128);
		var v2 = web3.toDecimal(signedByVerification.slice(128,130)) + 27;

		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		await zipperMS.checkAndTransferFrom_BlankCheck_Card([multisig, basicToken.address, recipient, verificationKey], [signer], m, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), [], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert(initialBalanceSender.minus(newBalanceSender).toString() === web3.toWei(1, "ether"), "balance did not transfer from sender");
		assert(newBalanceRecipient.minus(initialBalanceRecipient).toString() === web3.toWei(1, "ether"), "sssssssssssssssssssssssssbalance did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try{
			// try the same exact transfer
			await zipperMS.checkAndTransferFrom_BlankCheck_Card([multisig, basicToken.address, recipient, verificationKey], [signer], m, [v0, v1, v2], [r0.valueOf(), r1.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), [], {from: sponsor});
			assert(false, "duplicate transfer went through, but should have failed!")
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', error.message)
		}
	});

	it("should allow a blank check to be cashed when using two cards, and fail the second time if card digest is reused", async () => {
		const signer = accounts[0] // multisig signer (1of1)
		const recipient = accounts[2]
		const card = accounts[3]
		const verificationKey = accounts[4] // random verification key
		const multisig = accounts[5] // multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
		const sponsor = accounts[6] // Zippie PMG server
		const card2 = accounts[7]
		
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card2]

		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m_cards(signers, m);
		var signedByPrivateKey = web3.eth.sign(multisig, signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// sign by multisig signer
		var signByKey1 = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), verificationKey);
		var signedByKey1 = web3.eth.sign(signer, signByKey1).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		// sign by a random verification key
		var signByVerification = await zipperMS.soliditySha3_address(recipient);
		var signedByVerification = web3.eth.sign(verificationKey, signByVerification).slice(2);

		var r2 = '0x' + signedByVerification.slice(0,64);
		var s2 = '0x' + signedByVerification.slice(64,128);
		var v2 = web3.toDecimal(signedByVerification.slice(128,130)) + 27;

		// card 1
		const digest = '0xABCDEF'
		var digestHash = await zipperMS.soliditySha3_sign(digest)
		var signedByCard = web3.eth.sign(card, digestHash).slice(2);
		
		var rCard = '0x' + signedByCard.slice(0,64);
		var sCard = '0x' + signedByCard.slice(64,128);
		var vCard = web3.toDecimal(signedByCard.slice(128,130)) + 27;

		// card 2
		const digest2 = '0xFEDCBA'
		var digestHash2 = await zipperMS.soliditySha3_sign(digest2)
		var signedByCard2 = web3.eth.sign(card2, digestHash2).slice(2);
		
		var rCard2 = '0x' + signedByCard2.slice(0,64);
		var sCard2 = '0x' + signedByCard2.slice(64,128);
		var vCard2 = web3.toDecimal(signedByCard2.slice(128,130)) + 27;

		const digestHashes = [digestHash, digestHash2]

		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		await zipperMS.checkAndTransferFrom_BlankCheck_Card(
				[multisig, basicToken.address, recipient, verificationKey], signers, m, [v0, v1, vCard, vCard2, v2], 
				[r0.valueOf(), r1.valueOf(), rCard.valueOf(), rCard2.valueOf(), r2.valueOf()],
				[s0.valueOf(), s1.valueOf(), sCard.valueOf(), sCard2.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), digestHashes, {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert(initialBalanceSender.minus(newBalanceSender).toString() === web3.toWei(1, "ether"), "balance did not transfer from sender");
		assert(newBalanceRecipient.minus(initialBalanceRecipient).toString() === web3.toWei(1, "ether"), "sssssssssssssssssssssssssbalance did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try {
			// try transfer reusing card digest
			const duplicatedDigestHashes = [digestHash, digestHash]

			await zipperMS.checkAndTransferFrom_BlankCheck_Card(
				[multisig, basicToken.address, recipient, verificationKey], signers, m, [v0, v1, vCard, vCard, v2], 
				[r0.valueOf(), r1.valueOf(), rCard.valueOf(), rCard.valueOf(), r2.valueOf()],
				[s0.valueOf(), s1.valueOf(), sCard.valueOf(), sCard.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), duplicatedDigestHashes, {from: sponsor});
			assert(false, "duplicated digest transfer went through, but should have failed!")
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', error.message)
		}
	});

	it("should prevent a blank check to be cashed if card is incorrectly signed", async () => {
		const signer = accounts[0] // multisig signer (1of1)
		const payer = accounts[1]
		const recipient = accounts[2]
		const card = accounts[3]
		const verificationKey = accounts[4] // random verification key
		const multisig = accounts[5] // multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
		const sponsor = accounts[6] // Zippie PMG server
		
		const m = [1, 1, 1, 1]

		var signByPrivateKey = await zipperMS.soliditySha3_addresses_m_cards([signer, card], m);
		var signedByPrivateKey = web3.eth.sign(multisig, signByPrivateKey).slice(2);

		var r0 = '0x' + signedByPrivateKey.slice(0,64);
		var s0 = '0x' + signedByPrivateKey.slice(64,128);
		var v0 = web3.toDecimal(signedByPrivateKey.slice(128,130)) + 27;

		// sign by multisig signer
		var signByKey1 = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), verificationKey);
		var signedByKey1 = web3.eth.sign(signer, signByKey1).slice(2);

		var r1 = '0x' + signedByKey1.slice(0,64);
		var s1 = '0x' + signedByKey1.slice(64,128);
		var v1 = web3.toDecimal(signedByKey1.slice(128,130)) + 27;

		// sign by a random verification key
		// var signByVerification = web3.utils.soliditySha3("\x19Ethereum Signed Message:\n32", recipient);
		var signByVerification = await zipperMS.soliditySha3_address(recipient);
		var signedByVerification = web3.eth.sign(verificationKey, signByVerification).slice(2);

		var r2 = '0x' + signedByVerification.slice(0,64);
		var s2 = '0x' + signedByVerification.slice(64,128);
		var v2 = web3.toDecimal(signedByVerification.slice(128,130)) + 27;

		const digest = '0xABCDEF'
		var signByCard = await zipperMS.soliditySha3_sign(digest)
		// sign card with incorrect account
		var signedByCard = web3.eth.sign(payer, signByCard).slice(2);
		
		var rCard = '0x' + signedByCard.slice(0,64);
		var sCard = '0x' + signedByCard.slice(64,128);
		var vCard = web3.toDecimal(signedByCard.slice(128,130)) + 27;

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
	
		try {
			await zipperMS.checkAndTransferFrom_BlankCheck_Card([multisig, basicToken.address, recipient, verificationKey], [signer, card], m, [v0, v1, vCard, v2], [r0.valueOf(), r1.valueOf(), rCard.valueOf(), r2.valueOf()], [s0.valueOf(), s1.valueOf(), sCard.valueOf(), s2.valueOf()], web3.toWei(1, "ether"), [signByCard], {from: sponsor});
			assert(false, "transfer went through even though card was signed by wrong account")
		} catch (error) {
			assert(error.message == 'VM Exception while processing transaction: revert', error.message)
		}
	});
});

function log(title, msg) {
	console.log(title + ': ' + msg)
}