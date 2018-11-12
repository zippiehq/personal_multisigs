pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";

contract ZippieMultisig {

    // this is needed to prevent someone from reusing signatures to create unwanted transactions (replay protection)
    mapping (address => mapping(address => bool)) public usedNonces;
    mapping (address => mapping(bytes32 => bool)) public usedCardNonces;

    function verifyMultisigParameters(uint256 nrOfAddresses, uint256 nrOfSigners, uint8[] m, uint256 nrOfVs, uint256 nrOfRs, uint256 nrOfSs, uint256 nrOfCardNonces) internal pure {
        require(m[1] <= m[0], "Required number of signers cannot be higher than number of possible signers");
        require(m[3] <= m[2], "Required number of cards cannot be higher than number of possible cards");
        require(m[0] > 0, "Required number of signers cannot be 0");           
        require(m[1] > 0, "Possible number of signers cannot be 0");  
        // TODO: Do we need this if we use SafeMath?
        require(m[0] != 0xFF, "Cannot be MAX UINT8"); 
        require(m[1] != 0xFF, "Cannot be MAX UINT8"); 
        require(m[2] != 0xFF, "Cannot be MAX UINT8"); 
        require(m[3] != 0xFF, "Cannot be MAX UINT8"); 
        // TODO: Move address check or have offset as input
        require(nrOfAddresses == 2 + 1 + 1, "Incorrect number of addresses"); 
        require(nrOfSigners == m[0] + m[2], "Incorrect number of signers"); 
        require(nrOfVs == 2 + m[1] + m[3], "Incorrect number of signatures (v)"); 
        require(nrOfRs == 2 + m[1] + m[3], "Incorrect number of signatures (r)"); 
        require(nrOfSs == 2 + m[1] + m[3], "Incorrect number of signatures (s)"); 
        require(nrOfCardNonces == m[3], "Incorrect number of card nonces"); 
    }

    function verifyMultisigNonce(address multisigAddress, address nonceAddress, address addressSignedByNonce, uint8 v, bytes32 r, bytes32 s) internal {
        require(usedNonces[multisigAddress][nonceAddress] == false, "Nonce already used"); 
        require(nonceAddress == ecrecover(ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(addressSignedByNonce))), v, r, s), "Invalid nonce");
        // flag nonce as used to prevent reuse
        usedNonces[multisigAddress][nonceAddress] = true;   
    }

    /** @dev verify that the multisig account (temp priv key) signed to allow this array of addresses to access the account's funds.
        the temporary private key will keccak256 this array and m, to allow m of signers.length = n signatures in that array to transfer from the wallet
        @return true if the multisig address signed this hash, else false 
     */
    function verifyMultisigAccountSignature(address[] signers, uint8[] m, address multisigAddress, uint8 v, bytes32 r, bytes32 s) internal pure {
        require(multisigAddress == ecrecover(ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(signers, m))), v, r, s), "Invalid account");
    }

    /** @dev Verify that all signatures were addresses in signers, 
        that they all signed keccak256(amount, verificationKey) or keccak256(amount, receiver, nonce) (for cards)
        and that there are no duplicate signatures/addresses
     */
    function verifySignerSignatures(bytes32 signedHash, uint8 offset, uint8[] m, address[] signerAddresses, uint8[] v, bytes32[] r, bytes32[] s) internal pure {     
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
            require(isAddressInArray(mSign, addrOffset, signerAddresses, signerAddress), "Invalid address found when verifying signer signatures");

            // check that this address has NOT been used before
            require(!isAddressInArray(i, 0, usedSignerAddresses, signerAddress), "Signer address has been used already");

            // push this address to the usedAddresses array
            usedSignerAddresses[i] = signerAddress;
        }
    }

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
            require(isAddressInArray(mSign, addrOffset, cardAddresses, cardAddress), "Invalid address found when verifying card signatures");

            // check that this address has NOT been used before
            require(!isAddressInArray(i, 0, usedCardAddresses, cardAddress), "Card address has been used already");

            // push this address to the usedAddresses array
            usedCardAddresses[i] = cardAddress;
        }
    }

    function isAddressInArray(uint8 m, uint8 offset, address[] validAddresses, address checkAddress) internal pure returns(bool) {
        for (uint8 i = 0; i < m; i++) {
            if (validAddresses[i+offset] == checkAddress) {
                return true;
            }
        }
        return false;
    }
}