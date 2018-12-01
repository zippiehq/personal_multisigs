pragma solidity ^0.5.0;

import "./ZippieUtils.sol";

/**
  * @title Zippie Multisig
  * @dev Multi signature and nonce verification for multisig accounts 
  * it's enough if nonces are unique for a specific multisig contract
  * since a multsig account must always be created with a temp private key 
  * and will therefor only be useful in the contract that was used 
  * and sepcified during the setup of a new multisig account
 */
contract ZippieMultisig {

    // nonces for replay protection 
    mapping (address => mapping(address => bool)) public usedNonces;

    /** 
      * @dev Verify that a random nonce account (one time private key) 
      * signed an arbitrary hash and mark the nonce address 
      * as used for the specific multisig address
      * @param multisigAddress address of this multisig account
      * @param nonceAddress address of this nonce account
      * @param signedHash hash signed by nonce account
      * @param v v values of the nonce account signatures
      * @param r r values of the nonce account signatures
      * @param s s values of the nonce account signatures
      */
    function verifyMultisigNonce(
        address multisigAddress, 
        address nonceAddress, 
        bytes32 signedHash, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) 
        internal 
        returns (bool)
    {
        require(
            usedNonces[multisigAddress][nonceAddress] == false, 
            "Nonce already used"
        ); 
        require(
            nonceAddress == ecrecover(signedHash, v, r, s), 
            "Invalid nonce"
        );
        
        // flag nonce as used to prevent reuse
        usedNonces[multisigAddress][nonceAddress] = true; 
        return true;  
    }

    /** 
      * @dev Verify that the multisig account (temp private key)
      *  signed the array of possible signer addresses 
      *  and required number of signatures
      * @param signers all possible signers for this multsig account
      * @param m required number of signatures for this multisig account
      * @param multisigAddress address of this multisig account
      * @param v v values of the multisig account signatures
      * @param r r values of the multisig account signatures
      * @param s s values of the multisig account signatures
      */
    function verifyMultisigAccountSignature(
        address[] memory signers, 
        uint8[] memory m, 
        address multisigAddress, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) 
        internal 
        pure 
        returns (bool)
    {
        require(
            multisigAddress == ecrecover(
                ZippieUtils.toEthSignedMessageHash(
                    keccak256(abi.encodePacked(signers, m))
                ), 
                v, 
                r, 
                s
            ), 
            "Invalid account"
        );
        return true; 
    }

    /** 
      * @dev Verify that all provided signer signatures are valid
      * and that they all signed the same hash
      * @param signedHash hash signed by all signers
      * @param signerOffset offset values to signerAddresses array 
      * [0] offset index to first signer address
      * [1] number of signer addresses    
      * @param signerAddresses card addresses (starting from offset index)
      * @param signatureOffset offset values to signature arrays (v, r, s)
      * [0] offset index to first signer signature
      * [1] number of signer signatures   
      * @param v v values of card signatures (starting from offset index)
      * @param r r values of card signatures (starting from offset index)
      * @param s s values of card signatures (starting from offset index)
      */
    function verifyMultisigSignerSignatures(
        bytes32 signedHash, 
        uint8[2] memory signerOffset, 
        address[] memory signerAddresses, 
        uint8[2] memory signatureOffset, 
        uint8[] memory v, 
        bytes32[] memory r, 
        bytes32[] memory s
    ) 
        internal 
        pure 
        returns (bool)
    {     
        require(
            signatureOffset[1] <= signerOffset[1], 
            "Required number of signer signatures cannot be higher than number of possible signers"
        );
        require(
            signerOffset[0] != 0xFF, 
            "Signer offset cannot be MAX UINT8"
        );
        require(
            signerOffset[1] != 0xFF, 
            "Nr of signers cannot be MAX UINT8"
        );
        require(
            signatureOffset[0] != 0xFF,
            "Signature offset cannot be MAX UINT8"
        );
        require(
            signatureOffset[1] != 0xFF, 
            "Nr of signatures cannot be MAX UINT8"
        );
        require(
            signerAddresses.length >= signerOffset[0] + signerOffset[1], 
            "Incorrect number of signerAddresses"
        ); 
        require(
            v.length >= signatureOffset[0] + signatureOffset[1], 
            "Incorrect number of signatures (v)"
        ); 
        require(
            r.length >= signatureOffset[0] + signatureOffset[1], 
            "Incorrect number of signatures (r)"
        ); 
        require(
            s.length >= signatureOffset[0] + signatureOffset[1], 
            "Incorrect number of signatures (s)"
        ); 
        
        // remember used signer addresses to check for duplicates
        address[] memory usedSignerAddresses = new address[](signatureOffset[1]);

        // recovered signer address 
        address signerAddress;

        // check all signer signatures
        for (uint8 i = 0; i < signatureOffset[1]; i++) {

            // recover signer address
            signerAddress = ecrecover(
                signedHash, 
                v[signatureOffset[0]+i], 
                r[signatureOffset[0]+i], 
                s[signatureOffset[0]+i]
            );

            // check that address is a valid signer address 
            require(
                ZippieUtils.isAddressInArray(
                    signerAddress, 
                    signerOffset[0], 
                    signerOffset[1], 
                    signerAddresses
                ), 
                "Invalid address found when verifying signer signatures"
            );

            // check that this address is not a duplicate
            require(
                !ZippieUtils.isAddressInArray(
                    signerAddress, 
                    0, 
                    i, 
                    usedSignerAddresses
                ), 
                "Signer address has been used already"
            );

             // add this signer address to the used list
            usedSignerAddresses[i] = signerAddress;
        }
        return true; 
    }
}