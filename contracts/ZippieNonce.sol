pragma solidity ^0.4.24;

import "./ZippieUtils.sol";

contract ZippieNonce {

    // this is needed to prevent someone from reusing signatures to create unwanted transactions (replay protection)
    mapping (address => mapping(address => bool)) public usedNonces;

    function verifyMultisigNonce(address multisigAddress, address nonceAddress, address addressSignedByNonce, uint8 v, bytes32 r, bytes32 s) internal {
        require(usedNonces[multisigAddress][nonceAddress] == false, "Nonce already used"); 
        require(nonceAddress == ecrecover(ZippieUtils.toEthSignedMessageHash(keccak256(abi.encodePacked(addressSignedByNonce))), v, r, s), "Invalid nonce");
        // flag nonce as used to prevent reuse
        usedNonces[multisigAddress][nonceAddress] = true;   
    }
}