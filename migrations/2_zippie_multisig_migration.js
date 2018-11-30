var ZippieWallet = artifacts.require('./ZippieWallet.sol');
var ZippieCardNonces = artifacts.require('./ZippieCardNonces.sol');
var BasicERC20MockOwner = artifacts.require('./BasicERC20MockOwner.sol');

module.exports = function(deployer) {
    var basicToken;
    var zippieCardNonces;
    var zippieWallet;

    deployer
        .deploy(BasicERC20MockOwner)
        .then(function() {
            return BasicERC20MockOwner.deployed();
        })
        .then(function(BasicERC20MockOwnerInstance) {
            basicToken = BasicERC20MockOwnerInstance;
            return deployer.deploy(ZippieCardNonces);
        })
        .then(function() {
            return ZippieCardNonces.deployed();
        })
        .then(function(ZippieCardNoncesInstance) {
            zippieCardNonces = ZippieCardNoncesInstance;
            return deployer.deploy(ZippieWallet, zippieCardNonces.address);
        })
        .then(function() {
            return ZippieWallet.deployed();
        });
};
