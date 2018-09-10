pragma solidity 0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';

contract ZippieMultisigWallet{

    // declare global variable and mappings

    // this is needed to prevent someone from reusing signatures to create unwanted transactions and drain a multsig
    mapping (address => uint256) addressNonceMapping;
    mapping (address => mapping(address => bool)) public checkCashed;

    // PARAMS:

    // address[2] multisigAndERC20Contract -- a len 2 array of [multisig address to withdraw from, ERC20 token contract to use]
    // address[] allSignersPossible -- the temporary private key will keccak256 this array and m, to allow m of allSignersPossible.length = n signatures in that array to transfer from the wallet 
    // uint8 m -- the amount of signatures required to transfer from the multisig wallet

    // uint8[] v -- v values of all signatures, v[0] will be the temporary private key signature, and r[1], ... r[m] will be from the multisig keys
    // bytes32[] r -- r values of all signatures, r[0] will be from the temporary private key signature, as before...
    // bytes32[] s -- s values of all signatures, s[0] will be temporary private key signature, as before...
    // uint256 nonce -- the nonce of the sent, this must be the value in addressNonceMapping[address tempPrivKey] + 1;
    // address recipient -- recipient of the ERC20 tokens upon successful verification of the signatures, note that we must verify that the signers signed keccak256 recipient, amount, nonce
    // address amount -- amount of the ERC20 tokens to send upon successful verification of the signatures
  
    function checkAndTransferFrom(address[] multisigAndERC20Contract, address[] allSignersPossible, uint8 m, uint8[] v, bytes32[] r, bytes32[] s, uint256 nonce, address recipient, uint256 amount) public {

        // sanity check the inputs

        // require that m, n are well formed (m <= n, m not zero, and m not MAX_UINT8)
        // require that v/r/s.length are equal to (m + the original temp private key sig)
        // require that the nonce is incremented by 1
        
        // removed these checks for efficiency:
        // require that the balance of the multisig wallet is gt or equal to the amount requesting to be sent
        // require that the allowance of this contract is gt or equal to the amount requesting to be sent
        //	&& ERC20(wethAddressLocal).balanceOf(multiSigWallet) >= amount
        //	&& ERC20(wethAddressLocal).allowance(multiSigWallet, address(this)) >= amount

        require( 
            multisigAndERC20Contract.length == 2
            && m <= allSignersPossible.length 
            && m > 0
            && m != 0xFF
            && r.length == m + 1
            && s.length == m + 1
            && v.length == m + 1
            && nonce == addressNonceMapping[multisigAndERC20Contract[0]] + 1
        );

        // verify that the multisig wallet previously signed that these keys can access the funds
        require(verifyMultisigKeyAllowsAddresses(allSignersPossible, m, multisigAndERC20Contract[0], v[0], r[0], s[0]));

        // verify that all the other signatures were addresses in allSignersPossible, 
        // that they all signed keccak256(amount, receiver, nonce), 
        // and that there are no duplicate signatures/addresses

        // get the new hash to verify
        bytes32 hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(amount, recipient, nonce))));

        // make a memory mapping of (addresses => used this address?) to check for duplicates
        address[] memory usedAddresses = new address[](m);

        // loop through and ec_recover each v[] r[] s[] and verify that a correct address came out, and it wasn't a duplicate
        address addressVerify;

        for (uint8 i = 1; i < m + 1; i++){

            // get address from ec_recover
            addressVerify = ecrecover(hashVerify, v[i], r[i], s[i]);
            
            // check that address is a valid address 
            require(checkIfAddressInArray(allSignersPossible, addressVerify));

            // check that this address has not been used before
            require(!checkIfAddressInArray(usedAddresses, addressVerify));

            // if we've made it here, we have verified that the first signature is a valid signature of a legal account,
            // it isn't a duplicate signature,
            // and that the signature signed that he/she wants to transfer "amount" ERC20 token to "receiver"

            // push this address to the usedAddresses array
            usedAddresses[i - 1] = addressVerify;
        }

        // if we've made it here, past the guantlet of asserts(), then we have verified that these are all signatures of legal addresses
        // and that they all want to transfer "amount" tokens to "receiver"

        // now all there is left to do is transfer these tokens!
        ERC20(multisigAndERC20Contract[1]).transferFrom(multisigAndERC20Contract[0], recipient, amount);
        
        // increment the nonce
        addressNonceMapping[multisigAndERC20Contract[0]] = nonce;

        // done!
    }

    function checkAndTransferFrom_BlankCheck(address[] multisigAndERC20Contract, address[] allSignersPossible, uint8 m, uint8[] v, bytes32[] r, bytes32[] s, address recipient, uint256 amount, address verificationKey) public {
        address[] memory addresses = new address[](4);
        addresses[0] = multisigAndERC20Contract[0];
        addresses[1] = multisigAndERC20Contract[1];
        addresses[2] = recipient;
        addresses[3] = verificationKey;

        uint8[] memory signatureRequirements = new uint8[](4);
        signatureRequirements[0] = m;
        signatureRequirements[1] = m;
        signatureRequirements[2] = 0;
        signatureRequirements[3] = 0;
        
        bytes32[] memory cardDigests = new bytes32[](0);

        checkAndTransferFrom_BlankCheck_Card(addresses, allSignersPossible, signatureRequirements, v, r, s, amount, cardDigests);
    }

    // Almost same descriptions as at top but structured (combined) to prevent stack too deep errors
    // addresses -- multisig address, erc20 contract address, recipient, verification key
    // allSignersPossible -- signers followed by card signers
    // m -- nrOfSigners, minNrOfSigners, nrOfCardSigners, minNrOfCardSigners
    // v -- X, signer signatures, card signatures, Z
    // r -- X, signer signatures, card signatures, Z
    // s -- X, signer signatures, card signatures, Z
    // amount -- amount to transfer
    // cardDigests -- random values generated by cards at every read
    function checkAndTransferFrom_BlankCheck_Card(address[] addresses, address[] allSignersPossible, uint8[] m, uint8[] v, bytes32[] r, bytes32[] s, uint256 amount, bytes32[] cardDigests) public {

        require(
            addresses.length == 4
            && m[1] + m[3] <= allSignersPossible.length 
            && m[1] <= m[0]
            && m[3] <= m[2]
            && m[1] > 0
            && m[1] != 0xFF
            && r.length == m[1] + m[3] + 2
            && s.length == m[1] + m[3] + 2
            && v.length == m[1] + m[3] + 2
            && cardDigests.length == m[3]
            && !checkCashed[addresses[0]][addresses[3]]
        );

        // verify that the multisig wallet previously signed that these keys can access the funds
        require(verifyMultisigKeyAllowsAddressesInclCards(allSignersPossible, m, addresses[0], v[0], r[0], s[0]));

        // verify that all the other signatures were addresses in allSignersPossible, 
        // that they all signed keccak256(amount, verificationKey),
        // and that there are no duplicate signatures/addresses

        // get the new hash to verify
        bytes32 hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(amount, addresses[3]))));

        // make a memory mapping of (addresses => used this address?) to check for duplicates
        address[] memory usedAddresses = new address[](m[1] + m[3]);

        // loop through and ec_recover each v[] r[] s[] and verify that a correct address came out, and it wasn't a duplicate
        address addressVerify;

        for (uint8 i = 1; i < m[1] + m[3] + 1; i++) {

            if (i > m[1]) {
                // verify card digests
                hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", cardDigests[i-m[0]-1]));
            }

            // get address from ec_recover
            addressVerify = ecrecover(hashVerify, v[i], r[i], s[i]);

            // check that address is a valid address 
            require(checkIfAddressInArray(allSignersPossible, addressVerify));

            // check that this address has not been used before
            require(!checkIfAddressInArray(usedAddresses, addressVerify));

            // if we've made it here, we have verified that the first signature is a valid signature of a legal account,
            // it isn't a duplicate signature,
            // and that the signature signed that he/she wants to transfer "amount" ERC20 token to any chosen "receiver" by the user that has knowledge of 
            // the private verification key to cash the check 

            // push this address to the usedAddresses array
            usedAddresses[i - 1] = addressVerify;
        }

        // now verify the last element in the arrays is the verification key signing the recipient address
        hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(addresses[2]))));

        // note that i == m + 1, or the last element in r,s,v
        addressVerify = ecrecover(hashVerify, v[i], r[i], s[i]);

        require(addressVerify == addresses[3]);

        // if we've made it here, past the guantlet of asserts(), then we have verified that these are all signatures of legal addresses
        // and that they all want to transfer "amount" tokens to any chosen "receiver" by the user that has knowledge of 
        // the private verification key to cash the check 

        // now all there is left to do is transfer these tokens!
        ERC20(addresses[1]).transferFrom(addresses[0], addresses[2], amount);
            
        // add to the checkCashed array to so that this check can't be cashed again.
        checkCashed[addresses[0]][addresses[3]] = true;
    }


    // a simple helper function to check if an address is in an array...
    function checkIfAddressInArray(address[] validAddresses, address checkAddress) internal pure returns(bool){

        // loop through all addresses in array
        for (uint i = 0; i < validAddresses.length; i++){
            if (checkAddress == validAddresses[i]){ 
                return true;
            }
        }
        return false;
    }

    // helper function to verify that the multisig wallet (temp priv key) signed to allow this array of 
    // addresses to access the wallet funds.
    function verifyMultisigKeyAllowsAddresses(address[] signers, uint8 m, address multisigAddress, uint8 v, bytes32 r, bytes32 s) internal pure returns(bool successfulVerification){
        // NOTE: YOUR SIGNING APPLICATION MAY NOT PREPEND "\x19Ethereum Signed Message:\n32" TO THE OBJECT TO BE SIGNED. 
        // FEEL FREE TO REMOVE IF NECESSARY

        // verify that the tempPrivKey signed the initial signature of hash keccak256(allSignersPossible, m)
        bytes32 hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(signers, m))));

        // perform the ec_recover on this hash with the first v, r, s values
        address addressVerify = ecrecover(hashVerify, v, r, s);

        // return true if the multisig address signed this hash, else return false
        return multisigAddress == addressVerify;
    }

    function verifyMultisigKeyAllowsAddressesInclCards(address[] signers, uint8[] m, address multisigAddress, uint8 v, bytes32 r, bytes32 s) internal pure returns(bool successfulVerification){
        // NOTE: YOUR SIGNING APPLICATION MAY NOT PREPEND "\x19Ethereum Signed Message:\n32" TO THE OBJECT TO BE SIGNED. 
        // FEEL FREE TO REMOVE IF NECESSARY
        // verify that the tempPrivKey signed the initial signature of hash keccak256(allSignersPossible, m)
        // perform the ec_recover on this hash with the first v, r, s values
        // return true if the multisig address signed this hash, else return false
        // Support both old multisig hash (m) and new multisig hash (m[])
        return multisigAddress == ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(signers, m[1])))), v, r, s) ||
        multisigAddress == ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(signers, m)))), v, r, s);
    }

    // these functions are simply for testing
    // since truffle/web3 hashes things in a different way, we can call these pure functions
    // and hash things inside the evm so we can be sure that things will hash the same
    function soliditySha3_addresses_m(address[] validAddresses, uint8 m) public pure returns(bytes32){
        return keccak256(abi.encodePacked(validAddresses, m));
    }

    function soliditySha3_addresses_m_cards(address[] validAddresses, uint8[] m) public pure returns(bytes32){
        return keccak256(abi.encodePacked(validAddresses, m));
    }

    function soliditySha3_amount_recipient_nonce(uint256 amount, address recipient, uint256 nonce) public pure returns(bytes32){
        return keccak256(abi.encodePacked(amount, recipient, nonce));
    }

    function soliditySha3_amount_address(uint256 amount, address key) public pure returns(bytes32){
        return keccak256(abi.encodePacked(amount, key));
    }

    function soliditySha3_address(address addr) public pure returns(bytes32){
        return keccak256(abi.encodePacked(addr));
    }

    function soliditySha3_sign(bytes32 hash) public pure returns(bytes32){
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}