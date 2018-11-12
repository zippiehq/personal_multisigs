pragma solidity ^0.4.24;

import "./ZippieUtils.sol";

contract ZippieCard {

    mapping (address => mapping(bytes32 => bool)) public usedCardNonces;

    function verifyCardSignatures(bytes32[] cardNonces, uint8 offset, uint8[] m, address[] cardAddresses, uint8[] v, bytes32[] r, bytes32[] s) internal {
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
            // verify card digests
            require(usedCardNonces[cardAddresses[addrOffset+i]][cardNonces[i]] == false, "Card nonce reused");

            // store the card digest to prevent future reuse
            usedCardNonces[cardAddresses[addrOffset+i]][cardNonces[i]] = true;

            // get address from ec_recover
            cardAddress = ecrecover(cardNonces[i], v[signOffset+i], r[signOffset+i], s[signOffset+i]);

            // check that address is a valid address 
            require(ZippieUtils.isAddressInArray(mSign, addrOffset, cardAddresses, cardAddress), "Invalid address found when verifying card signatures");

            // check that this address has NOT been used before
            require(!ZippieUtils.isAddressInArray(i, 0, usedCardAddresses, cardAddress), "Card address has been used already");

            // push this address to the usedAddresses array
            usedCardAddresses[i] = cardAddress;
        }
    }
}