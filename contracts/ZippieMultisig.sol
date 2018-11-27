pragma solidity >=0.5.0 <0.6.0;

import "./ZippieUtils.sol";

contract ZippieMultisig {

    /** @dev verify that the multisig account (temp priv key) signed to allow this array of addresses to access the account's funds.
        the temporary private key will keccak256 this array and m, to allow m of signers.length = n signatures in that array to transfer from the wallet
        @return true if the multisig address signed this hash, else false 
     */
    function verifyMultisigAccountSignature(address[] memory signers, uint8[] memory m, address multisigAddress, uint8 v, bytes32 r, bytes32 s) internal pure {
        require(multisigAddress == ecrecover(ZippieUtils.toEthSignedMessageHash(keccak256(abi.encodePacked(signers, m))), v, r, s), "Invalid account");
    }

    /** @dev Verify that all signatures were addresses in signers, 
        that they all signed keccak256(amount, verificationKey) or keccak256(amount, receiver, nonce) (for cards)
        and that there are no duplicate signatures/addresses
     */
    function verifySignerSignatures(bytes32 signedHash, uint8 offset, uint8[] memory m, address[] memory signerAddresses, uint8[] memory v, bytes32[] memory r, bytes32[] memory s) internal pure {     
        // destruct m array
        // TODO: create function that returns instead of creating variables  (cheaper?)
        uint8 mSign = m[1];
        uint8 addrOffset = 0;  // Signer addresses comes first
        uint8 signOffset = offset; // Offset (account+verification)

        // make a memory mapping of (addresses => used this address?) to check for duplicates
        address[] memory usedSignerAddresses = new address[](mSign);

        // loop through and ec_recover each v[] r[] s[] and verify that a correct address came out, and it wasn't a duplicate
        address signerAddress;

        for (uint8 i = 0; i < mSign; i++) {
            // get address from ec_recover
            signerAddress = ecrecover(signedHash, v[signOffset+i], r[signOffset+i], s[signOffset+i]);

            // check that address is a valid address 
            require(ZippieUtils.isAddressInArray(mSign, addrOffset, signerAddresses, signerAddress), "Invalid address found when verifying signer signatures");

            // check that this address has NOT been used before
            require(!ZippieUtils.isAddressInArray(i, 0, usedSignerAddresses, signerAddress), "Signer address has been used already");

            // push this address to the usedAddresses array
            usedSignerAddresses[i] = signerAddress;
        }
    }
}