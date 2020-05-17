pragma solidity ^0.6.0;

interface IZippieMerchantRegistry {
    function setMerchantOwner(bytes32 merchantId, address newOwner) 
        external returns (bool);

    function merchantOwner(bytes32 merchantId) 
        external view returns(address);
}