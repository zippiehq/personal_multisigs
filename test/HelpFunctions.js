var TestFunctions = artifacts.require("./TestFunctions.sol");
var test
TestFunctions.new().then(instance => {
	test = instance
})

module.exports = {
	createBlankCheck_1of1Signer_1of1Card,
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
}

async function createBlankCheck_1of1Signer_1of1Card(
	multisigAccount,
	tokenAddress,
	recipientAccount,
	nonceAccount,
	signerAccount,
	cardNumber,
	m,
	amount,
	cardNonceNumber
) 
{
	const cardSignature = await getHardcodedDigestSignature(cardNumber, cardNonceNumber)
	const signers = [signerAccount, cardSignature.pubkey]
	const multisigSignature = await getMultisigSignature(signers, m, multisigAccount)
	const blankCheckSignature = await getBlankCheckSignature2(nonceAccount, signerAccount, amount)
	const recipientSignature = await getRecipientSignature(recipientAccount, nonceAccount)	
	
	const addresses = [multisigAccount, tokenAddress, recipientAccount, nonceAccount]
	const signatures = getSignature(multisigSignature, blankCheckSignature, cardSignature, recipientSignature)
	const cardNonces = [cardSignature.digestHash]

	return { addresses: addresses, signers: signers, m: m, signatures: signatures, amount: amount, cardNonces: cardNonces }
}
	
async function getBlankCheckSignature2(verificationKey, signer, amount) {
	// sign by multisig signer
	const blankCheckHash = await test.soliditySha3_name_amount_address("redeemBlankCheck", amount, verificationKey);
	const blankCheckSignature = await web3.eth.sign(blankCheckHash, signer);
	return getRSV(blankCheckSignature.slice(2))
}

async function getMultisigSignature(signers, m, multisig) {
	const multisigHash = await test.soliditySha3_addresses_m(signers, m);
	const multisigSignature = await web3.eth.sign(multisigHash, multisig);
	return getRSV(multisigSignature.slice(2))
}

async function getRecipientSignature(recipient, verificationKey) {
	// sign by a random verification key
	const recipientHash = await test.soliditySha3_address(recipient);
	const recipientSignature = await web3.eth.sign(recipientHash, verificationKey);
	return getRSV(recipientSignature.slice(2))
}

function getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature) {
	const v = [multisigSignature.v, recipientSignature.v, blankCheckSignature.v, digestSignature.v]
	const r = [multisigSignature.r.valueOf(), recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf()]
	const s = [multisigSignature.s.valueOf(), recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf()]

	return {v:v, r:r, s:s}
}
 async function getBlankCheckSignature(verificationKey, signer, amount) {
	// sign by multisig signer
	const blankCheckHash = await test.soliditySha3_name_amount_address("redeemBlankCheck", web3.utils.toWei(amount, "ether"), verificationKey);
	const blankCheckSignature = await web3.eth.sign(blankCheckHash, signer);
	return getRSV(blankCheckSignature.slice(2))
}

async function getNonceSignature(nonce, verificationKey) {
	// sign by a random verification key
	const nonceHash = await test.soliditySha3_address(nonce);
	const nonceSignature = await web3.eth.sign(nonceHash, verificationKey);
	return getRSV(nonceSignature.slice(2))
}

async function getSetLimitSignature(verificationKey, signer, amount) {
	// sign by multisig signer
	const limitHash = await test.soliditySha3_name_amount_address("setLimit", web3.utils.toWei(amount, "ether"), verificationKey);
	const limitSignature = await web3.eth.sign(limitHash, signer);
	return getRSV(limitSignature.slice(2))
}

async function getDigestSignature(digestHash, card) {
	const digestSignature = await web3.eth.sign(digestHash, card);
	return getRSV(digestSignature.slice(2))
}

function getSignatureFrom3(multisigSignature, blankCheckSignature, recipientSignature) {
	const v = [multisigSignature.v, recipientSignature.v, blankCheckSignature.v]
	const r = [multisigSignature.r.valueOf(), recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf()]
	const s = [multisigSignature.s.valueOf(), recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf()]

	return {v:v, r:r, s:s}
}

function getEmptyDigestSignature() {
	return {
		pubkey: "0x0000000000000000000000000000000000000000",
		digestHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
		v: 0,
		r: "0x0000000000000000000000000000000000000000000000000000000000000000",
		s: "0x0000000000000000000000000000000000000000000000000000000000000000",
	}
}

function getHardcodedDigestSignature(cardNr, signatureNr) {
	var pubkey, digestHash, v, r, s

	switch (cardNr) {
		case 0:
			if (signatureNr === 0) {
				pubkey = "0x40B4eC8EC80b485118816FF998Ce4E54c88aBD20"
				digestHash = "0x62bfc2682ba513b4efec24a94bd705bae1f579fe530064e3d27e22d19ce1f3f7"
				v = 28
				r = "0x4340c567835c900f77d1a0aefa7e498c55b096fb752d5360020a1d69165d3627"
				s = "0x0856fd5f536c1cdbcd09599a09c6cfc6a6fc210660a5c488ccf6218856604a81"
			}
			break;
		case 1:
			if (signatureNr === 0) {
				pubkey = "0x02c0686faf97875549dd5a6c55f73e1baf2b9d9f"
				digestHash = "0xa86ea246bff8922efae2e2d22f4e114b3c758b36b5ac2f8ecc04b7b98ebcabbc"
				v = 28
				r = "0x35da76e3c1cd6c60c4c92f92add73f118ba7b389a267982004bb9cdb682684ab"
				s = "0x311fdd88e1d9c754499e122484792ccc7dce7f9282df8e7d23f5b4ea3b8cfd97"
			}  else if (signatureNr === 1) {
				pubkey = "0x02c0686faf97875549dd5a6c55f73e1baf2b9d9f"
				digestHash = "0xd5a668fc5da39210210b83cee4dc8422473084baaa3a0804b81a25dfcf21c6ef"
				v = 28
				r = "0x1b4a824b558bcdc7936c5c195bec1a459d26b57adbd3607cf9c9e712fe622b30"
				s = "0x106ba332d87d0b425d8fd3e2c72294c213af7c7fd93a11acae81099ab5fe32ee"
			} else if (signatureNr === 2) {
				pubkey = "0x02c0686faf97875549dd5a6c55f73e1baf2b9d9f"
				digestHash = "0xdf8382f8257cbfd6922d9c76783dc6c99ceb804bde0723458757755664c0c207"
				v = 27
				r = "0xff9a55f4281d670d6f01cf1e3c31fb168e80c394e770677675cd8d83636aff5c"
				s = "0x1acb75fd7008a82e3d77724ca6466bf7d5a2882f3f7ce59a30e51da015391657"
			} else if (signatureNr === 3) {
				pubkey = "0x02c0686faf97875549dd5a6c55f73e1baf2b9d9f"
				digestHash = "0x70915fdfd58a64fcef64173901950e5f07bcc987eb9f52382d4a0cd44d88ffb0"
				v = 28
				r = "0xd3ee7f13696cf091be44db3b05ef2ff333c50ef092f768e6605c8393c56277fa"
				s = "0x304528bcd8cbaf24da03429ca929eba70a85813ed6a1305e8e538085830fd78d"
			} else if (signatureNr === 4) {
				pubkey = "0x02c0686faf97875549dd5a6c55f73e1baf2b9d9f"
				digestHash = "0x1f6ccaa41bf8a736a8d12af3c4971312f93ef49b557e5dde4316e6ef0827e2a6"
				v = 27
				r = "0x22945c6b72bd8e9e2127c88f7663f2e08c9cfddca2c8d0f04d4859259cda4e01"
				s = "0x04b5352459d0b77f1665873e4158c23b9d3416dac8afd6af4bb9b1c99f4ac41a"
			}
		default:
			break;
	}

	return {pubkey:pubkey, digestHash:digestHash, v:v, r:r, s:s}
}

function getRSV(str) {
	return {r:'0x' + str.slice(0,64), s: '0x' + str.slice(64,128), v: web3.utils.hexToNumber(str.slice(128,130)) + 27 };
}

function log(msg) {
	console.log(msg)
}