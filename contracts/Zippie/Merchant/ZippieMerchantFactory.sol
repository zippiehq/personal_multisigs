pragma solidity ^0.6.0;

import "./ZippieMerchantOwner.sol";
import "./IZippieMerchantRegistry.sol";

/**
  * @title Zippie Merchant Factory
  * @dev Deploy new Zippie Merchant Owner Contract and config
 */
contract ZippieMerchantFactory {
  
  event MerchantOwnerDeployed(address addr, address indexed owner, address indexed merchantId);

  function deployMerchantOwner(
    address owner,
    address merchantId,
    address merchantRegistry,
    bytes memory contentHash
  ) 
    public 
  {
    ZippieMerchantOwner merchantOwner = new ZippieMerchantOwner(owner);

    // Do we want to do this here? can be removed later
    // merchantOwner.grantRole(keccak256("transferB2B"), owner);
    // merchantOwner.grantRole(keccak256("transferB2C"), owner);

    // Sign somthing with merchantId to show caller posses privateKey

    IZippieMerchantRegistry(merchantRegistry).setMerchant(merchantId, address(merchantOwner), contentHash);
    // Setup ENS ?

    emit MerchantOwnerDeployed(address(merchantOwner), owner, merchantId);
  }
  
}
