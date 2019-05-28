const ZippieWalletERC20 = artifacts.require("./ZippieWalletERC20.sol");
const ZippieWalletERC721 = artifacts.require("./ZippieWalletERC721.sol");
const ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");
const BasicERC20MockOwner = artifacts.require("./BasicERC20MockOwner.sol");

module.exports = function(deployer) {
    var basicToken;
    var zippieCardNonces;
    var zippieWalletERC20;
    var zippieWalletERC721;

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
            return deployer.deploy(ZippieWalletERC20, zippieCardNonces.address);
        })
        .then(function() {
            return ZippieWalletERC20.deployed();
        })
        .then(function(ZippieWalletInstance) {
            return deployer.deploy(ZippieWalletERC721, zippieCardNonces.address);
        })
        .then(function() {
            return ZippieWalletERC721.deployed();
        })
};
