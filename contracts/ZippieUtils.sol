pragma solidity ^0.5.0;

library ZippieUtils {

    /** 
      * isAddressInArray
      * @dev check if an address is in part of an array of addresses (using offset and count)
      */
    function isAddressInArray(address item, uint8 offset, uint8 length, address[] memory items) internal pure returns(bool) {
        require(items.length >= offset + length, "Not enough number of items");
        for (uint8 i = 0; i < length; i++) {
            if (items[offset+i] == item) {
                return true;
            }
        }
        return false;
    }

    /**
    * toEthSignedMessageHash
    * @dev prefix a bytes32 value with "\x19Ethereum Signed Message:"
    * and hash the result
    */
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}