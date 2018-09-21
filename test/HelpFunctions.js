var TestFunctions = artifacts.require("./TestFunctions.sol");
var test
TestFunctions.new().then(instance => {
	test = instance
})

export function log(msg) {
	console.log(msg)
}

export function getRSV(str) {
	return {r:'0x' + str.slice(0,64), s: '0x' + str.slice(64,128), v: web3.utils.hexToNumber(str.slice(128,130)) + 27 };
}

export async function getMultisigSignature(signers, m, multisig) {
	const multisigHash = await test.soliditySha3_addresses_m(signers, m);
	const multisigSignature = await web3.eth.sign(multisigHash, multisig);
	return getRSV(multisigSignature.slice(2))
}

export async function getBlankCheckSignature(verificationKey, signer) {
	// sign by multisig signer
	const blankCheckHash = await test.soliditySha3_amount_address(web3.utils.toWei("1", "ether"), verificationKey);
	const blankCheckSignature = await web3.eth.sign(blankCheckHash, signer);
	return getRSV(blankCheckSignature.slice(2))
}

export async function getRecipientSignature(recipient, verificationKey) {
	// sign by a random verification key
	const recipientHash = await test.soliditySha3_address(recipient);
	const recipientSignature = await web3.eth.sign(recipientHash, verificationKey);
	return getRSV(recipientSignature.slice(2))
}

export async function getDigestSignature(digestHash, card) {
	const digestSignature = await web3.eth.sign(digestHash, card);
	return getRSV(digestSignature.slice(2))
}

export function getSignature(multisigSignature, blankCheckSignature, digestSignature, recipientSignature) {
	const v = [multisigSignature.v, blankCheckSignature.v, digestSignature.v, recipientSignature.v]
	const r = [multisigSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), recipientSignature.r.valueOf()]
	const s = [multisigSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), recipientSignature.s.valueOf()]

	return {v:v, r:r, s:s}
}
