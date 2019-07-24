const ZippieWalletERC20 = artifacts.require("./ZippieWalletERC20.sol");
const ZippieWalletERC721 = artifacts.require("./ZippieWalletERC721.sol");
const ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");
const BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
const BasicERC721Mock = artifacts.require("./BasicERC721Mock.sol");


module.exports = function(deployer, network, accounts) {
    var basicERC20;
    var basicERC721;
    var zippieCardNonces;
    var zippieWalletERC20;
    var zippieWalletERC721;

    deployer
        .deploy(BasicERC20Mock, accounts[0])
        .then(function() {
            return BasicERC20Mock.deployed();
        })
        .then(function(BasicERC20MockInstance) {
            basicERC20 = BasicERC20MockInstance;
            return deployer.deploy(BasicERC721Mock, accounts[0]);
        })
        .then(function() {
            return BasicERC721Mock.deployed();
        })
        .then(function(BasicERC721MockInstance) {
            basicERC721 = BasicERC721MockInstance;
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
