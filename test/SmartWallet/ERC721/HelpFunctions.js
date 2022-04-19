// XXX Bytecode changes if contract is moved into a new folder (huh?)
//const { bytecode:accountBytecode } = require('../build/contracts/ZippieAccountERC20.json')
const accountBytecode = '0x608060405234801561001057600080fd5b50600080546001600160a01b0319163317905560ff806100316000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063daea85c514602d575b600080fd5b605060048036036020811015604157600080fd5b50356001600160a01b03166052565b005b6000546001600160a01b03163314606857600080fd5b60408051600160e01b63a22cb4650281523360048201526001602482015290516001600160a01b0383169163a22cb46591604480830192600092919082900301818387803b15801560b857600080fd5b505af115801560cb573d6000803e3d6000fd5b503292505050fffea165627a7a72305820138a39f8dcc74909958a7c9a3debcc975c1b1527953c47473594aa49882499790029'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = {
	ZERO_ADDRESS,
	getSmartWalletAccountAddress,
}

function getSmartWalletAccountAddress(merchantId, orderId, walletAddress) {
	const bytecode = accountBytecode
	const bytecodeHash = web3.utils.sha3(bytecode)
	const salt = web3.utils.soliditySha3(merchantId, orderId)
	const accountHash = web3.utils.sha3(`0x${'ff'}${walletAddress.slice(2)}${salt.slice(2)}${bytecodeHash.slice(2)}`)
	const accountAddress = `0x${accountHash.slice(-40)}`.toLowerCase()
	return web3.utils.toChecksumAddress(accountAddress)
}