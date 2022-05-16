// XXX Bytecode changes if contract is moved into a new folder (huh?)
//const { bytecode:accountBytecode } = require('../build/contracts/ZippieAccountERC721.json')
const accountBytecode = '0x608060405234801561001057600080fd5b50600080546001600160a01b0319163317905560ff806100316000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063daea85c514602d575b600080fd5b605060048036036020811015604157600080fd5b50356001600160a01b03166052565b005b6000546001600160a01b03163314606857600080fd5b60408051600160e01b63a22cb4650281523360048201526001602482015290516001600160a01b0383169163a22cb46591604480830192600092919082900301818387803b15801560b857600080fd5b505af115801560cb573d6000803e3d6000fd5b503292505050fffea165627a7a72305820138a39f8dcc74909958a7c9a3debcc975c1b1527953c47473594aa49882499790029'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const MAX_AMOUNT = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

const { ethers } = require("hardhat");

module.exports = {
	ZERO_ADDRESS,
	MAX_AMOUNT,
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
}

async function createBlankCheck_1of1Signer_NoCard(
	tokenAddress,
	recipientAccount,
	nonceAccount,
	signerAccount,
	m,
	tokenId) 
{
	const signers = [signerAccount.address]
	const signerSignature = await getBlankCheckSignature(nonceAccount, signerAccount, tokenId, tokenAddress)
	const nonceSignature = await getRecipientSignature(recipientAccount, nonceAccount)	
	
	const addresses = [tokenAddress, recipientAccount, nonceAccount.address]
	const signatures = getSignatureNoCard(signerSignature, nonceSignature)
	const cardNonces = []

	return { addresses: addresses, signers: signers, m: m, signatures: signatures, tokenId: tokenId, cardNonces: cardNonces }
}

async function createBlankCheck_1of1Signer_1of1Card(
	tokenAddress,
	recipientAccount,
	nonceAccount,
	signerAccount,
	cardNumber,
	m,
	tokenId,
	cardNonceNumber
) 
{
	const cardSignature = await getHardcodedDigestSignature(cardNumber, cardNonceNumber)
	const signers = [signerAccount.address, cardSignature.pubkey]
	const signerSignature = await getBlankCheckSignature(nonceAccount, signerAccount, tokenId, tokenAddress)
	const nonceSignature = await getRecipientSignature(recipientAccount, nonceAccount)	
	
	const addresses = [tokenAddress, recipientAccount, nonceAccount.address]
	const signatures = getSignature(signerSignature, cardSignature, nonceSignature)
	const cardNonces = [cardSignature.digestHash]

	return { addresses: addresses, signers: signers, m: m, signatures: signatures, tokenId: tokenId, cardNonces: cardNonces }
}

function getAccountAddress(signers, m, walletAddress) {
	const bytecode = accountBytecode
	const bytecodeHash = ethers.utils.keccak256(bytecode)
	const salt = soliditySha3_addresses_m(signers, m)
	const accountHash = ethers.utils.keccak256(`0x${'ff'}${walletAddress.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
	const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()
	return ethers.utils.getAddress(accountAddress)
}

async function getMultisigSignature(signers, m, multisig) {
	const multisigHash = soliditySha3_addresses_m(signers, m)
	const multisigSignature = await multisig.signMessage(ethers.utils.arrayify(multisigHash))
	return getRSV(multisigSignature)
}

async function getRecipientSignature(recipient, verificationKey) {
	// sign by a random verification key
	const recipientHash = soliditySha3_address(recipient)
	const recipientSignature = await verificationKey.signMessage(ethers.utils.arrayify(recipientHash))
	return getRSV(recipientSignature)
}

function getSignature(blankCheckSignature, digestSignature, recipientSignature) {
	const v = [recipientSignature.v, blankCheckSignature.v, digestSignature.v]
	const r = [recipientSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf()]
	const s = [recipientSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf()]
	return {v:v, r:r, s:s}
}

async function getBlankCheckSignature(verificationKey, signer, tokenId, tokenAddress) {
	// sign by multisig signer
	const blankCheckHash = soliditySha3_name_address_amount_address("redeemBlankCheck", tokenAddress, tokenId, verificationKey.address)
	const blankCheckSignature = await signer.signMessage(ethers.utils.arrayify(blankCheckHash))
	return getRSV(blankCheckSignature)
}

async function getNonceSignature(nonce, verificationKey) {
	// sign by a random verification key
	const nonceHash = soliditySha3_address(nonce);
	const nonceSignature = await verificationKey.signMessage(ethers.utils.arrayify(nonceHash))
	return getRSV(nonceSignature)
}

async function getDigestSignature(digestHash, card) {
	const digestSignature = await card.signMessage(ethers.utils.arrayify(digestHash))
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
			break
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
			break
	}

	return {pubkey:pubkey, digestHash:digestHash, v:v, r:r, s:s}
}

function getRSV(str) {
	return ethers.utils.splitSignature(str)
}

function soliditySha3_addresses_m(signers, m) {
	return ethers.utils.solidityKeccak256(['address[]', 'uint8[]'], [signers, m]) 
}

function soliditySha3_name_address_amount_address(name, token, amount, key) {
	return ethers.utils.solidityKeccak256(['string','address','uint256','address'],[name, token, amount, key])
}

function soliditySha3_address(addr) {
	return ethers.utils.solidityKeccak256(['address'],[addr])
}

function soliditySha3_sign(hash) {
	return hash //web3.utils.soliditySha3("\x19Ethereum Signed Message:\n32", hash)
}