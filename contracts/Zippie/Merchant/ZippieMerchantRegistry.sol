pragma solidity ^0.6.0;

import "./IZippieMerchantRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZippieMerchantRegistry is IZippieMerchantRegistry, Ownable {

    mapping (bytes32 => address) private _merchantOwners;
    event MerchantOwnershipChanged(bytes32 indexed merchantId, address indexed previousOwner, address indexed newOwner);

    function setMerchantOwner(
        bytes32 merchantId, 
        address newOwner
    ) 
        public 
        override
        onlyOwner 
        returns (bool) 
    {
        require(
            newOwner != address(0), 
            "Invalid owner address"
        );
        emit MerchantOwnershipChanged(merchantId, _merchantOwners[merchantId], newOwner);
        _merchantOwners[merchantId] = newOwner;
        return true;
    }

    function merchantOwner( 
        bytes32 merchantId
    ) 
        public 
        override
        view 
        returns (address) 
    {
        return _merchantOwners[merchantId];
    }
}