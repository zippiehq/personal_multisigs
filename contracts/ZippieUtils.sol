pragma solidity ^0.4.24;

library ZippieUtils {

    function isAddressInArray(uint8 m, uint8 offset, address[] validAddresses, address checkAddress) internal pure returns(bool) {
        for (uint8 i = 0; i < m; i++) {
            if (validAddresses[i+offset] == checkAddress) {
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