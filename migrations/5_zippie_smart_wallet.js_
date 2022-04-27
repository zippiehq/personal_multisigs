const ZippieSmartWalletERC20 = artifacts.require('ZippieSmartWalletERC20');

// truffle migrate -f 5 --to 5 --network zippienet
module.exports = function(deployer, network, accounts) {
    let wallet;

    deployer
        .deploy(ZippieSmartWalletERC20,'0x6fD3267bbc75be0d7596487Bd1946fEc447274f1')
        .then(function(walletInstance) {
            wallet = walletInstance;
        });
};
