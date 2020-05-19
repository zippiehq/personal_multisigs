pragma solidity ^0.6.0;

interface IZippieMerchantRegistry {
    function setMerchant(address merchantId, address owner, bytes calldata contentHash) 
        external returns (bool);

    function owner(address merchantId) 
        external view returns(address);

    function contentHash(address merchantId) 
        external view returns(bytes memory);

    function hasPremission(bytes32 premission, address merchantId)
        external view returns(bool);
}