pragma solidity ^0.6.0;

interface IZippieMerchantRegistry {
    function setMerchantOwner(address merchantId, address newOwner) 
        external returns (bool);

    function merchantOwner(address merchantId) 
        external view returns(address);

    function hasPremission(bytes32 premission, address merchantId)
        external view returns(bool);
}