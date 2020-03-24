// XXX Bytecode changes if contract is moved into a new folder (huh?)
//const { bytecode:accountBytecode } = require('../build/contracts/ZippieAccountERC20.json')
const accountBytecode = '0x608060405234801561001057600080fd5b50600080546001600160a01b03191633179055610171806100326000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063daea85c514610030575b600080fd5b6100566004803603602081101561004657600080fd5b50356001600160a01b0316610058565b005b6000546001600160a01b0316331461006f57600080fd5b60408051600160e01b63095ea7b3028152336004820152600019602482015290516001600160a01b0383169163095ea7b39160448083019260209291908290030181600087803b1580156100c257600080fd5b505af11580156100d6573d6000803e3d6000fd5b505050506040513d60208110156100ec57600080fd5b50516101425760408051600160e51b62461bcd02815260206004820152600e60248201527f417070726f7665206661696c6564000000000000000000000000000000000000604482015290519081900360640190fd5b32fffea165627a7a7230582032c59f0247a959ee08569c8456e1b35a213a36088625adeb369ffa1a46228e3e0029'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = {
	ZERO_ADDRESS,
	createBlankCheck_1of1Signer_NoCard,
	createBlankCheck_1of1Signer_1of1Card,
	getAccountAddress,
	getMultisigSignature,
	getRecipientSignature,
	getSignature,
	getBlankCheckSignature,
	getNonceSignature,
	getDigestSignature,
	getSignatureNoCard,
	getEmptyDigestSignature,
	getHardcodedDigestSignature,
	getRSV,
	soliditySha3_addresses_m,
	soliditySha3_name_address_amount_address,
	soliditySha3_address,
	soliditySha3_sign,
	log,
}

async function createBlankCheck_1of1Signer_NoCard(
	tokenAddress,
	recipientAccount,
	nonceAccount,
	signerAccount,
	m,
	amount) 
{
	const signers = [signerAccount]
	const signerSignature = await getBlankCheckSignature(nonceAccount, signerAccount, amount, tokenAddress)
	const nonceSignature = await getRecipientSignature(recipientAccount, nonceAccount)	
	
	const addresses = [tokenAddress, recipientAccount, nonceAccount]
	const signatures = getSignatureNoCard(signerSignature, nonceSignature)
	const cardNonces = []

	return { addresses: addresses, signers: signers, m: m, signatures: signatures, amount: web3.utils.toWei(amount, "ether"), cardNonces: cardNonces }
}

async function createBlankCheck_1of1Signer_1of1Card(
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
	const signerSignature = await getBlankCheckSignature(nonceAccount, signerAccount, amount, tokenAddress)
	const nonceSignature = await getRecipientSignature(recipientAccount, nonceAccount)	
	
	const addresses = [tokenAddress, recipientAccount, nonceAccount]
	const signatures = getSignature(signerSignature, cardSignature, nonceSignature)
	const cardNonces = [cardSignature.digestHash]

	return { addresses: addresses, signers: signers, m: m, signatures: signatures, amount: web3.utils.toWei(amount, "ether"), cardNonces: cardNonces }
}

function getAccountAddress(signers, m, walletAddress) {
	const bytecode = accountBytecode
	const bytecodeHash = web3.utils.sha3(bytecode)
	const salt = soliditySha3_addresses_m(signers, m);
	//const salt = web3.utils.sha3(web3.eth.abi.encodeParameters(['address[]', 'uint8[]'], [bc1.signers, bc1.m]))
	const accountHash = web3.utils.sha3(`0x${'ff'}${walletAddress.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
	const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()
	return web3.utils.toChecksumAddress(accountAddress)
}

async function getMultisigSignature(signers, m, multisig) {
	const multisigHash = soliditySha3_addresses_m(signers, m);
	const multisigSignature = await web3.eth.sign(multisigHash, multisig);
	return getRSV(multisigSignature.slice(2))
}

async function getRecipientSignature(recipient, verificationKey) {
	// sign by a random verification key
	const recipientHash = soliditySha3_address(recipient);
	const recipientSignature = await web3.eth.sign(recipientHash, verificationKey);
	return getRSV(recipientSignature.slice(2))
}

function getSignature(blankCheckSignature, digestSignature, recipientSignature) {
	const v = [recipientSignature.v, blankCheckSignature.v, digestSignature.v]
	const r = [recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf()]
	const s = [recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf()]

	return {v:v, r:r, s:s}
}

async function getBlankCheckSignature(verificationKey, signer, amount, tokenAddress) {
	// sign by multisig signer
	const blankCheckHash = soliditySha3_name_address_amount_address("redeemBlankCheck", tokenAddress, web3.utils.toWei(amount, "ether"), verificationKey);
	const blankCheckSignature = await web3.eth.sign(blankCheckHash, signer);
	return getRSV(blankCheckSignature.slice(2))
}

async function getNonceSignature(nonce, verificationKey) {
	// sign by a random verification key
	const nonceHash = soliditySha3_address(nonce);
	const nonceSignature = await web3.eth.sign(nonceHash, verificationKey);
	return getRSV(nonceSignature.slice(2))
}

async function getDigestSignature(digestHash, card) {
	const digestSignature = await web3.eth.sign(digestHash, card);
	return getRSV(digestSignature.slice(2))
}

function getSignatureNoCard(blankCheckSignature, recipientSignature) {
	const v = [recipientSignature.v, blankCheckSignature.v]
	const r = [recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf()]
	const s = [recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf()]

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
	let pubkey, digestHash, v, r, s

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
	return {r:"0x" + str.slice(0,64), s: "0x" + str.slice(64,128), v: web3.utils.hexToNumber(str.slice(128,130)) + 27 };
}

function soliditySha3_addresses_m(signers, m) {
	return web3.utils.soliditySha3('0x' + getAbiParameterArrayEncodePacked(signers) + getAbiParameterArrayEncodePacked(m))
}

function soliditySha3_name_address_amount_address(name, token, amount, key) {
	return web3.utils.soliditySha3(name, token, amount, key)
}

function soliditySha3_address(addr) {
	return web3.utils.soliditySha3(addr)
}

function soliditySha3_sign(hash) {
	return web3.utils.soliditySha3("\x19Ethereum Signed Message:\n32", hash);
}

function getAbiParameterArrayEncodePacked(dataArray) {
	let packedData = ''
	for (let i = 0; i < dataArray.length; i++) {
		packedData = packedData + web3.utils.padLeft(dataArray[i], 64).slice(2)
	}
	return packedData
}

function log(msg) {
	console.log(msg)
}