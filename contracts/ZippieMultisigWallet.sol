pragma solidity 0.4.24;

// basic ERC20 interface contract 
contract ERC20 {
    function totalSupply() view public returns (uint supply);
    function balanceOf(address _owner) view public returns (uint balance);
    function transfer(address _to, uint _value) public returns (bool success);
    function transferFrom(address _from, address _to, uint _value) public returns (bool success);
    function approve(address _spender, uint _value) public returns (bool success);
    function allowance(address _owner, address _spender) view public returns (uint remaining);
    event Transfer(address indexed _from, address indexed _to, uint _value);
    event Approval(address indexed _owner, address indexed _spender, uint _value);
}

contract ZippieMultisigWallet{

    // declare global variable and mappings

    // this is needed to prevent someone from reusing signatures to create unwanted transactions and drain a multsig
    mapping (address => uint256) addressNonceMapping;
    mapping (address => mapping(address => bool)) public checkCashed;

    // empty contructor
    constructor() public {
    }

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

    function checkAndTransferFrom_SenderSigner(address[] multisigAndERC20Contract, address[] allSignersPossible, uint8 m, uint8[] v, bytes32[] r, bytes32[] s, uint256 nonce, address recipient, uint256 amount) public {
        require( 
            multisigAndERC20Contract.length == 2
            && m <= allSignersPossible.length 
            && m > 0
            && m != 0xFF
            // changes here, where r/s/v.length must be == m because the msg.sender is the signer
            && r.length == m
            && s.length == m
            && v.length == m
            // end changes
            && nonce == addressNonceMapping[multisigAndERC20Contract[0]] + 1
        );

        // verify that the multisig wallet previously signed that these keys can access the funds
        require(verifyMultisigKeyAllowsAddresses(allSignersPossible, m, multisigAndERC20Contract[0], v[0], r[0], s[0]));

        // now check that all the other signatures are acceptable, and send tokens
        
        // get the new hash to verify
        bytes32 hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(amount, recipient, nonce))));

        // make a memory mapping of (addresses => used this address?) to check for duplicates
        address[] memory usedAddresses = new address[](m);

        // verify that the msg.sender account is also in the array of allowed addresses.
        // if it is, then we accept the msg.sender as one of the signers
        // also, add msg.sender to the userAddresses array 
        require(checkIfAddressInArray(allSignersPossible, msg.sender));

        usedAddresses[m - 1] = msg.sender;

        // loop through and ec_recover each v[] r[] s[] and verify that a correct address came out, and it wasn't a duplicate
        address addressVerify;

        // changs here, where it's i < m not i < m - 1
        for (uint8 i = 1; i < m; i++) {
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
    }

    function checkAndTransferFrom_BlankCheck(address[] multisigAndERC20Contract, address[] allSignersPossible, uint8 m, uint8[] v, bytes32[] r, bytes32[] s, address recipient, uint256 amount, address verificationKey) public {

        require( 
            multisigAndERC20Contract.length == 2
            && m <= allSignersPossible.length 
            && m > 0
            && m != 0xFF
            && r.length == m + 2
            && s.length == m + 2
            && v.length == m + 2
            && !checkCashed[multisigAndERC20Contract[0]][verificationKey]
        );

        // verify that the multisig wallet previously signed that these keys can access the funds
        require(verifyMultisigKeyAllowsAddresses(allSignersPossible, m, multisigAndERC20Contract[0], v[0], r[0], s[0]));

        // verify that all the other signatures were addresses in allSignersPossible, 
        // that they all signed keccak256(amount, verificationKey),
        // and that there are no duplicate signatures/addresses

        // get the new hash to verify
        bytes32 hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(amount, verificationKey))));

        // make a memory mapping of (addresses => used this address?) to check for duplicates
        address[] memory usedAddresses = new address[](m);

        // loop through and ec_recover each v[] r[] s[] and verify that a correct address came out, and it wasn't a duplicate
        address addressVerify;

        for (uint8 i = 1; i < m + 1; i++) {
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
        hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(recipient))));

        // note that i == m + 1, or the last element in r,s,v
        addressVerify = ecrecover(hashVerify, v[i], r[i], s[i]);

        require(addressVerify == verificationKey);

        // if we've made it here, past the guantlet of asserts(), then we have verified that these are all signatures of legal addresses
        // and that they all want to transfer "amount" tokens to any chosen "receiver" by the user that has knowledge of 
        // the private verification key to cash the check 

        // now all there is left to do is transfer these tokens!
        ERC20(multisigAndERC20Contract[1]).transferFrom(multisigAndERC20Contract[0], recipient, amount);
            
        // add to the checkCashed array to so that this check can't be cashed again.
        checkCashed[multisigAndERC20Contract[0]][verificationKey] = true;
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

    // removed m from generic checkAndTransferFrom, because m always = 1
    function checkAndTransferFrom_1of1(address[] multisigAndERC20Contract, address[] allSignersPossible, uint8[] v, bytes32[] r, bytes32[] s, uint256 nonce, address recipient, uint256 amount) public {

        // can remove sanity checks for m
        require(
            multisigAndERC20Contract.length == 2 
            && r.length == 2
            && s.length == 2
            && v.length == 2
            && nonce == addressNonceMapping[multisigAndERC20Contract[0]] + 1
            // new check to see if there is only one address in the signers array
            && allSignersPossible.length == 1
        );

        // verify that the multisig wallet previously signed that these keys can access the funds, m = 1 for this function
        require(verifyMultisigKeyAllowsAddresses(allSignersPossible, uint8(1), multisigAndERC20Contract[0], v[0], r[0], s[0]));

        // get the new hash to verify
        bytes32 hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(amount, recipient, nonce))));

        // get address from ec_recover
        address addressVerify = ecrecover(hashVerify, v[1], r[1], s[1]);
        
        // check that address is a valid address (the one and only address in all signers array)
        require(allSignersPossible[0] == addressVerify);

        // if we've made it here, we have verified that the first signature is a valid signature of the 1of1 multisig account
        // and that the signature signed that he/she wants to transfer "amount" ERC20 token to "receiver"

        // if we've made it here, past the guantlet of asserts(), then we have verified that these are all signatures of legal addresses
        // and that they all want to transfer "amount" tokens to "receiver"

        // now all there is left to do is transfer these tokens!
        ERC20(multisigAndERC20Contract[1]).transferFrom(multisigAndERC20Contract[0], recipient, amount);
            
        // increment the nonce
        addressNonceMapping[multisigAndERC20Contract[0]] = nonce;
    }

    // removed m from generic checkAndTransferFrom, because m always = 1
    function checkAndTransferFrom_2of2(address[] multisigAndERC20Contract, address[] allSignersPossible, uint8[] v, bytes32[] r, bytes32[] s, uint256 nonce, address recipient, uint256 amount) public {

        // can remove sanity checks for m
        require( 
            multisigAndERC20Contract.length == 2
            && r.length == 3
            && s.length == 3
            && v.length == 3
            && nonce == addressNonceMapping[multisigAndERC20Contract[0]] + 1
            // add new check for the signers array to verify there are 2 addresses
            && allSignersPossible.length == 2
        );

        // verify that the personal multisig key signed for this series of addresses, use m = 2 in this situation
        require(verifyMultisigKeyAllowsAddresses(allSignersPossible, uint8(2), multisigAndERC20Contract[0], v[0], r[0], s[0]));

        // verify that all the other signatures were addresses in allSignersPossible, 
        // that they all signed keccak256(amount, receiver, nonce), 
        // and that there are no duplicate signatures/addresses

        // get the new hash to verify
        bytes32 hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(amount, recipient, nonce))));

        // get the first address from ec_recover
        address addressVerify = ecrecover(hashVerify, v[1], r[1], s[1]);
        
        // check that address is a valid address 
        require(allSignersPossible[0] == addressVerify || allSignersPossible[1] == addressVerify);

        address usedAddress = addressVerify;

        // if we've made it here, the first signature is valud
        // now lets check the second and make sure it's not a duplicate 

        // get the second address from ecrecover
        addressVerify = ecrecover(hashVerify, v[2], r[2], s[2]);

        // check that this address is valid, and that it's not a duplicate
        require((allSignersPossible[0] == addressVerify || allSignersPossible[1] == addressVerify) && addressVerify != usedAddress);

        // if we've made it here, we have verified that the first signature is a valid signature of a legal account,
        // and that the second signature is also a legal signature, and it isn't a duplicate signature,
        // and that the signatures both agress he/she wants to transfer "amount" ERC20 token to "receiver"

        // now all there is left to do is transfer these tokens!
        ERC20(multisigAndERC20Contract[1]).transferFrom(multisigAndERC20Contract[0], recipient, amount);
            
        // increment the nonce
        addressNonceMapping[multisigAndERC20Contract[0]] = nonce;
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
        bytes32 hashVerify = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(signers, m))));

        // perform the ec_recover on this hash with the first v, r, s values
        address addressVerify = ecrecover(hashVerify, v, r, s);

        // return true if the multisig address signed this hash, else return false
        return multisigAddress == addressVerify;
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