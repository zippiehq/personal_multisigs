var BasicERC20 = artifacts.require("./BasicERC20.sol");
var ZipperMultisigWallet = artifacts.require("./ZipperMultisigWallet.sol");

module.exports = function(deployer, network, accounts){
	if (network == 'development'){
		// accounts[9] is going to be the "temp private key"
		deployer.deploy(BasicERC20, accounts[9]).then( () => {
			return deployer.deploy(ZipperMultisigWallet);
		}).then( () => {
			// approve the ZipperWallet contract to withdraw tokens (from the temp private key address)
			return BasicERC20.at(BasicERC20.address).approve(ZipperMultisigWallet.address, web3.toWei(100, "ether"), {from: accounts[9]});
		});
	}
}