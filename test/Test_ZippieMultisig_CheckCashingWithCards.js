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
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]

		var multisigHash = await zipperMS.soliditySha3_addresses_m_cards(signers, m);
		var multisigSignature = web3.eth.sign(multisig, multisigHash).slice(2);
		const multisigSig = getRSV(multisigSignature)

		// sign by multisig signer
		var blankCheckHash = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), verificationKey);
		var blankCheckSignature = web3.eth.sign(signer, blankCheckHash).slice(2);
		const blankCheckSig = getRSV(blankCheckSignature)

		// sign by a random verification key
		var recipientHash = await zipperMS.soliditySha3_address(recipient);
		var recipientSignature = web3.eth.sign(verificationKey, recipientHash).slice(2);
		const recipientSig = getRSV(recipientSignature)

		const digest = '0xABCDEF'
		var digestHash = await zipperMS.soliditySha3_sign(digest)
		var digestSignature = web3.eth.sign(card, digestHash).slice(2);
		const digestSig = getRSV(digestSignature)
		
		const v = [multisigSig.v, blankCheckSig.v, digestSig.v, recipientSig.v]
		const r = [multisigSig.r.valueOf(), blankCheckSig.r.valueOf(), digestSig.r.valueOf(), recipientSig.r.valueOf()]
		const s = [multisigSig.s.valueOf(), blankCheckSig.s.valueOf(), digestSig.s.valueOf(), recipientSig.s.valueOf()]

		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		await zipperMS.checkAndTransferFrom_BlankCheck_Card(addresses, signers, m, v, r, s, web3.toWei(1, "ether"), [digestHash], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert(initialBalanceSender.minus(newBalanceSender).toString() === web3.toWei(1, "ether"), "balance did not transfer from sender");
		assert(newBalanceRecipient.minus(initialBalanceRecipient).toString() === web3.toWei(1, "ether"), "sssssssssssssssssssssssssbalance did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try {
			// try the same exact transfer
			await zipperMS.checkAndTransferFrom_BlankCheck_Card(addresses, signers, m, v, r, s, web3.toWei(1, "ether"), [digestHash], {from: sponsor});
			assert(false, "duplicate transfer went through, but should have failed!")
		}
		catch(error){
			assert(error.message == 'VM Exception while processing transaction: revert', error.message)
		}
	});

	it("should allow a blank check to be cashed once even if no card is required, and fail the second time", async () => {
		const signer = accounts[0] // multisig signer (1of1)
		const recipient = accounts[2]
		const verificationKey = accounts[4] // random verification key
		const multisig = accounts[5] // multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
		const sponsor = accounts[6] // Zippie PMG server
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 0, 0]

		var multisigHash = await zipperMS.soliditySha3_addresses_m_cards([signer], m);
		var multisigSignature = web3.eth.sign(multisig, multisigHash).slice(2);
		const multisigSig = getRSV(multisigSignature)

		// sign by multisig signer
		var blankCheckHash = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), verificationKey);
		var blankCheckSignature = web3.eth.sign(signer, blankCheckHash).slice(2);
		const blankCheckSig = getRSV(blankCheckSignature)

		// sign by a random verification key
		var recipientHash = await zipperMS.soliditySha3_address(recipient);
		var recipientSignature = web3.eth.sign(verificationKey, recipientHash).slice(2);
		const recipientSig = getRSV(recipientSignature)

		const v = [multisigSig.v, blankCheckSig.v, recipientSig.v]
		const r = [multisigSig.r.valueOf(), blankCheckSig.r.valueOf(), recipientSig.r.valueOf()]
		const s = [multisigSig.s.valueOf(), blankCheckSig.s.valueOf(), recipientSig.s.valueOf()]

		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		await zipperMS.checkAndTransferFrom_BlankCheck_Card(addresses, [signer], m, v, r, s, web3.toWei(1, "ether"), [], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert(initialBalanceSender.minus(newBalanceSender).toString() === web3.toWei(1, "ether"), "balance did not transfer from sender");
		assert(newBalanceRecipient.minus(initialBalanceRecipient).toString() === web3.toWei(1, "ether"), "sssssssssssssssssssssssssbalance did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try{
			// try the same exact transfer
			await zipperMS.checkAndTransferFrom_BlankCheck_Card(addresses, [signer], m, v, r, s, web3.toWei(1, "ether"), [], {from: sponsor});
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
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const m = [1, 1, 2, 2]
		const signers = [signer, card, card2]

		var multisigHash = await zipperMS.soliditySha3_addresses_m_cards(signers, m);
		var multisigSignature = web3.eth.sign(multisig, multisigHash).slice(2);
		const multisigSig = getRSV(multisigSignature)

		// sign by multisig signer
		var blankCheckHash = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), verificationKey);
		var blankCheckSignature = web3.eth.sign(signer, blankCheckHash).slice(2);
		const blankCheckSig = getRSV(blankCheckSignature)

		// sign by a random verification key
		var recipientHash = await zipperMS.soliditySha3_address(recipient);
		var recipientSignature = web3.eth.sign(verificationKey, recipientHash).slice(2);
		const recipientSig = getRSV(recipientSignature)

		// card 1
		const digest = '0xABCDEF'
		var digestHash = await zipperMS.soliditySha3_sign(digest)
		var digestSignature = web3.eth.sign(card, digestHash).slice(2);
		const digestSig = getRSV(digestSignature)
		
		// card 2
		const digest2 = '0xFEDCBA'
		var digestHash2 = await zipperMS.soliditySha3_sign(digest2)
		var digestSignature2 = web3.eth.sign(card2, digestHash2).slice(2);
		const digestSig2 = getRSV(digestSignature2)
		
		const v = [multisigSig.v, blankCheckSig.v, digestSig.v, digestSig2.v, recipientSig.v]
		const r = [multisigSig.r.valueOf(), blankCheckSig.r.valueOf(), digestSig.r.valueOf(), digestSig2.r.valueOf(), recipientSig.r.valueOf()]
		const s = [multisigSig.s.valueOf(), blankCheckSig.s.valueOf(), digestSig.s.valueOf(), digestSig2.s.valueOf(), recipientSig.s.valueOf()]

		const digestHashes = [digestHash, digestHash2]

		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		await zipperMS.checkAndTransferFrom_BlankCheck_Card(addresses, signers, m, v, r, s, web3.toWei(1, "ether"), digestHashes, {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert(initialBalanceSender.minus(newBalanceSender).toString() === web3.toWei(1, "ether"), "balance did not transfer from sender");
		assert(newBalanceRecipient.minus(initialBalanceRecipient).toString() === web3.toWei(1, "ether"), "sssssssssssssssssssssssssbalance did not transfer to recipient");
		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try {
			// try transfer reusing card digest
			const duplicatedDigestHashes = [digestHash, digestHash]

			await zipperMS.checkAndTransferFrom_BlankCheck_Card(addresses, signers, m, v, r, s, web3.toWei(1, "ether"), duplicatedDigestHashes, {from: sponsor});
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
		
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]

		const multisigHash = await zipperMS.soliditySha3_addresses_m_cards(signers, m);
		const multisigSignature = web3.eth.sign(multisig, multisigHash).slice(2);
		const multisigSig = getRSV(multisigSignature)

		// sign by multisig signer
		const blankCheckHash = await zipperMS.soliditySha3_amount_address(web3.toWei(1, "ether"), verificationKey);
		const blankCheckSignature = web3.eth.sign(signer, blankCheckHash).slice(2);
		const blankCheckSig = getRSV(blankCheckSignature)

		// sign by a random verification key
		const recipientHash = await zipperMS.soliditySha3_address(recipient);
		const recipientSignature = web3.eth.sign(verificationKey, recipientHash).slice(2);
		const recipientSig = getRSV(recipientSignature)

		const digest = '0xABCDEF'
		const digestHash = await zipperMS.soliditySha3_sign(digest)
		// sign card with incorrect account
		const digestSignature = web3.eth.sign(payer, digestHash).slice(2);
		const digestSig = getRSV(digestSignature)
		
		const v = [multisigSig.v, blankCheckSig.v, digestSig.v, recipientSig.v]
		const r = [multisigSig.r.valueOf(), blankCheckSig.r.valueOf(), digestSig.r.valueOf(), recipientSig.r.valueOf()]
		const s = [multisigSig.s.valueOf(), blankCheckSig.s.valueOf(), digestSig.s.valueOf(), recipientSig.s.valueOf()]

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");

		try {
			await zipperMS.checkAndTransferFrom_BlankCheck_Card(addresses, signers, m, v, r, s, web3.toWei(1, "ether"), [digestHash], {from: sponsor});
			assert(false, "transfer went through even though card was signed by wrong account")
		} catch (error) {
			assert(error.message == 'VM Exception while processing transaction: revert', error.message)
		}
	});
});

function log(title, msg) {
	console.log(title + ': ' + msg)
}

function getRSV(str) {
	return {r:'0x' + str.slice(0,64), s: '0x' + str.slice(64,128), v: web3.toDecimal(str.slice(128,130)) + 27 };
}