pragma solidity >=0.5.0 <0.6.0;

import "./nonce/IHashNonce.sol";
import "./ZippieUtils.sol";

contract ZippieCard {

    address private _zippieCardNonce;

    constructor(address zippieCardNonce) public {
        _zippieCardNonce = zippieCardNonce;
    }

    function verifyCardSignatures(bytes32[] memory cardNonces, uint8 offset, uint8[] memory m, address[] memory cardAddresses, uint8[] memory v, bytes32[] memory r, bytes32[] memory s) internal {
        // destruct m array
        // TODO: create function that returns instead of creating variables  (cheaper?)
        uint8 mSign = m[3]; // nr of required card singatures
        uint8 addrOffset = m[0];  // Signer addresses
        uint8 signOffset = offset+m[1]; // Offset (account+verification) + Signer signatures

        // make a memory mapping of (addresses => used this address?) to check for duplicates
        address[] memory usedCardAddresses = new address[](mSign);
       
        // loop through and ec_recover each v[] r[] s[] and verify that a correct address came out, and it wasn't a duplicate
        address cardAddress;

        for (uint8 i = 0; i < mSign; i++) {

            // recover card 
            cardAddress = ecrecover(cardNonces[i], v[signOffset+i], r[signOffset+i], s[signOffset+i]);

            // check that address is a valid address 
            require(ZippieUtils.isAddressInArray(mSign, addrOffset, cardAddresses, cardAddress), "Invalid address found when verifying card signatures");

            // check that this address has NOT been used before
            require(!ZippieUtils.isAddressInArray(i, 0, usedCardAddresses, cardAddress), "Card address has been used already");

            // push this address to the usedAddresses array
            usedCardAddresses[i] = cardAddress;

            // flag card nonce as used
            require(IHashNonce(_zippieCardNonce).useNonce(cardAddress ,cardNonces[i], v[signOffset+i], r[signOffset+i], s[signOffset+i]));
        }
    }
}