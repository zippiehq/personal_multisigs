// XXX Bytecode changes if contract is moved into a new folder (huh?)
//const { bytecode:accountBytecode } = require('../build/contracts/ZippieAccountERC20.json')
const accountBytecode = '0x608060405234801561001057600080fd5b50600080546001600160a01b03191633179055610171806100326000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063daea85c514610030575b600080fd5b6100566004803603602081101561004657600080fd5b50356001600160a01b0316610058565b005b6000546001600160a01b0316331461006f57600080fd5b60408051600160e01b63095ea7b3028152336004820152600019602482015290516001600160a01b0383169163095ea7b39160448083019260209291908290030181600087803b1580156100c257600080fd5b505af11580156100d6573d6000803e3d6000fd5b505050506040513d60208110156100ec57600080fd5b50516101425760408051600160e51b62461bcd02815260206004820152600e60248201527f417070726f7665206661696c6564000000000000000000000000000000000000604482015290519081900360640190fd5b32fffea165627a7a7230582032c59f0247a959ee08569c8456e1b35a213a36088625adeb369ffa1a46228e3e0029'
const accountBytecodeErc721 = '0x608060405234801561001057600080fd5b50600080546001600160a01b0319163317905560ff806100316000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063daea85c514602d575b600080fd5b605060048036036020811015604157600080fd5b50356001600160a01b03166052565b005b6000546001600160a01b03163314606857600080fd5b60408051600160e01b63a22cb4650281523360048201526001602482015290516001600160a01b0383169163a22cb46591604480830192600092919082900301818387803b15801560b857600080fd5b505af115801560cb573d6000803e3d6000fd5b503292505050fffea165627a7a72305820138a39f8dcc74909958a7c9a3debcc975c1b1527953c47473594aa49882499790029'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = {
	ZERO_ADDRESS,
	getSmartWalletAccountAddress,
	getUpdateEnsContentHashSignature,
	getTransferB2BSignature,
	getTransferB2CSignature,
	getSmartWalletAccountAddressErc721,
	getTransferB2BSignatureErc721,
	getTransferB2CSignatureErc721,
	getMintTokenSignature,
	getMintTokenSignatureErc721,
	getApproveTransferFromSignatureErc721,
	getRejectTransferFromSignatureErc721,
	getRSV,
}

function getSmartWalletAccountAddress(merchantId, orderId, walletAddress) {
	const bytecode = accountBytecode
	const bytecodeHash = web3.utils.sha3(bytecode)
	const salt = web3.utils.soliditySha3(merchantId, orderId)
	const accountHash = web3.utils.sha3(`0x${'ff'}${walletAddress.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
	const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()
	return web3.utils.toChecksumAddress(accountAddress)
}

async function getUpdateEnsContentHashSignature(signerAccount, ensResolver, ensNode, contentHash) {
	const hash = web3.utils.soliditySha3('updateEnsContentHash', ensResolver, ensNode, contentHash)
	const signature = await web3.eth.sign(hash, signerAccount);
	return getRSV(signature.slice(2))
}

async function getTransferB2BSignature(signerAccount, token, senderMerchant, senderOrderId, recipientMerchant, recipientOrderId, amount) {
	const transferHash = web3.utils.soliditySha3('transferB2B', token, senderMerchant, senderOrderId, recipientMerchant, recipientOrderId, amount)
	const transferSignature = await web3.eth.sign(transferHash, signerAccount);
	return getRSV(transferSignature.slice(2))
}

async function getTransferB2CSignature(signerAccount, token, senderMerchant, senderOrderId, recipient, amount) {
	const transferHash = web3.utils.soliditySha3('transferB2C', token, senderMerchant, senderOrderId, recipient, amount)
	const transferSignature = await web3.eth.sign(transferHash, signerAccount);
	return getRSV(transferSignature.slice(2))
}

function getSmartWalletAccountAddressErc721(merchantId, orderId, walletAddress) {
	const bytecode = accountBytecodeErc721
	const bytecodeHash = web3.utils.sha3(bytecode)
	const salt = web3.utils.soliditySha3(merchantId, orderId)
	const accountHash = web3.utils.sha3(`0x${'ff'}${walletAddress.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
	const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()
	return web3.utils.toChecksumAddress(accountAddress)
}

async function getTransferB2BSignatureErc721(signerAccount, token, senderMerchant, senderOrderId, recipientMerchant, recipientOrderId, tokenId) {
	const transferHash = web3.utils.soliditySha3('transferB2B', token, senderMerchant, senderOrderId, recipientMerchant, recipientOrderId, tokenId)
	const transferSignature = await web3.eth.sign(transferHash, signerAccount);
	return getRSV(transferSignature.slice(2))
}

async function getTransferB2CSignatureErc721(signerAccount, token, senderMerchant, senderOrderId, recipient, tokenId) {
	const transferHash = web3.utils.soliditySha3('transferB2C', token, senderMerchant, senderOrderId, recipient, tokenId)
	const transferSignature = await web3.eth.sign(transferHash, signerAccount);
	return getRSV(transferSignature.slice(2))
}

async function getMintTokenSignature(signerAccount, token, to, amount) {
	const mintHash = web3.utils.soliditySha3('mintToken', token, to, amount)
	const mintSignature = await web3.eth.sign(mintHash, signerAccount);
	return getRSV(mintSignature.slice(2))
}

async function getMintTokenSignatureErc721(signerAccount, token, to, tokenId, tokenURI) {
	const mintHash = web3.utils.soliditySha3('mintToken_ERC721', token, to, tokenId, tokenURI)
	const mintSignature = await web3.eth.sign(mintHash, signerAccount);
	return getRSV(mintSignature.slice(2))
}

async function getApproveTransferFromSignatureErc721(signerAccount, token, from, to, tokenId, metadata) {
	const hash = web3.utils.soliditySha3('approveTransferFrom_ERC721', token, from, to, tokenId, metadata)
	const signature = await web3.eth.sign(hash, signerAccount);
	return getRSV(signature.slice(2))
}

async function getRejectTransferFromSignatureErc721(signerAccount, token, from, to, tokenId, metadata) {
	const hash = web3.utils.soliditySha3('rejectTransferFrom_ERC721', token, from, to, tokenId, metadata)
	const signature = await web3.eth.sign(hash, signerAccount);
	return getRSV(signature.slice(2))
}

function getRSV(str) {
	return { r: '0x' + str.slice(0,64), s: '0x' + str.slice(64,128), v: web3.utils.hexToNumber(str.slice(128,130)) + 27 };
}
