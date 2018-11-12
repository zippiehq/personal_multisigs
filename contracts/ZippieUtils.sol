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
}