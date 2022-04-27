const ZippieMerchantRegistry = artifacts.require('ZippieMerchantRegistry');
const ZippieSmartWalletERC20 = artifacts.require('ZippieSmartWalletERC20');

module.exports = function(deployer, network, accounts) {
    let registry;
    let wallet;

    deployer
        .deploy(ZippieMerchantRegistry)
        .then(function(registryInstance) {
            registry = registryInstance;
            return deployer.deploy(
                ZippieSmartWalletERC20,
                registryInstance.address
            );
        })
        .then(function(walletInstance) {
            wallet = walletInstance;
        });
};
