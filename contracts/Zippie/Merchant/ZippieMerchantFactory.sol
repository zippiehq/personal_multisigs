pragma solidity ^0.8.0;

import "./ZippieMerchantOwner.sol";
import "./IZippieMerchantRegistry.sol";

/**
  * @title Zippie Merchant Factory
  * @dev Deploy new Zippie Merchant Owner Contract and config
 */
contract ZippieMerchantFactory {

    address _merchantRegistry;
    address _ensRegistry;
    address _ensRegistrar;
    address _ensResolver;
  
    event MerchantOwnerDeployed(address addr, address indexed owner, address indexed merchantId);

    constructor(
        address merchantRegistry,
        address ensRegistry,
        address ensRegistrar,
        address ensResolver
    ) 
        public 
    {
        _merchantRegistry = merchantRegistry;
        _ensRegistry = ensRegistry;
        _ensRegistrar = ensRegistrar;
        _ensResolver = ensResolver;
    }

    function deployMerchantOwner(
        address owner,
        address operator,
        address merchantId,
        bytes memory contentHash,
        bytes32 ensLabel,
        bytes32 ensNode
    ) 
        public 
    {
        ZippieMerchantOwner merchantOwner = new ZippieMerchantOwner(owner, operator, merchantId, _ensRegistry, _ensRegistrar, _ensResolver, ensLabel, ensNode);
        IZippieMerchantRegistry(_merchantRegistry).setMerchant(merchantId, address(merchantOwner), contentHash);
        emit MerchantOwnerDeployed(address(merchantOwner), owner, merchantId);
    }
}
