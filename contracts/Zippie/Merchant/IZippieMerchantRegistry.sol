pragma solidity ^0.8.0;

/**
 * @title ZippieMerchantRegistry interface
 */
interface IZippieMerchantRegistry {
    function setMerchant(address merchantId, address owner, bytes calldata contentHash) 
        external returns (bool);

    function owner(address merchantId) 
        external view returns(address);

    function contentHash(address merchantId) 
        external view returns(bytes memory);

    function hasPermission(bytes32 permission, address merchantId)
        external view returns(bool);
}