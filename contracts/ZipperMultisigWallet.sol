pragma solidity ^0.4.18;

// basic ERC20 interface contract 
contract ERC20 {
	function totalSupply() constant public returns (uint supply);
	function balanceOf(address _owner) constant public returns (uint balance);
	function transfer(address _to, uint _value) public returns (bool success);
	function transferFrom(address _from, address _to, uint _value) public returns (bool success);
	function approve(address _spender, uint _value) public returns (bool success);
	function allowance(address _owner, address _spender) constant public returns (uint remaining);
	event Transfer(address indexed _from, address indexed _to, uint _value);
	event Approval(address indexed _owner, address indexed _spender, uint _value);
}

contract ZipperMultisigWallet{

	// declare global variable and mappings

	// this is needed to prevent someone from reusing signatures to create unwanted transactions and drain a multsig
	mapping (address => uint256) addressNonceMapping;

	address WETHAddress;

	// empty contructor
	function ZipperMultisigWallet(address wethAddress) public {
		WETHAddress = wethAddress;
	}

	// PARAMS:

	// address[] allSignersPossible -- the temporary private key will keccak256 this array and m, to allow m of allSignersPossible.length = n signatures in that array to transfer from the wallet 
	// uint8 m -- the amount of signatures required to transfer from the multisig wallet

	// uint8[] v -- v values of all signatures, v[0] will be the temporary private key signature, and r[1], ... r[m] will be from the multisig keys
	// bytes32[] r -- r values of all signatures, r[0] will be from the temporary private key signature, as before...
	// bytes32[] s -- s values of all signatures, s[0] will be temporary private key signature, as before...
	// uint256 nonce -- the nonce of the sent, this must be the value in addressNonceMapping[address tempPrivKey] + 1;
	// address recipient -- recipient of the ERC20 tokens upon successful verification of the signatures, note that we must verify that the signers signed keccak256 recipient, amount, nonce
	// address amount -- amount of the ERC20 tokens to send upon successful verification of the signatures
	
	function checkAndTransferFrom(address multiSigWallet, address[] allSignersPossible, uint8 m, uint8[] v, bytes32[] r, bytes32[] s, uint256 nonce, address recipient, uint256 amount) public {

		// sanity check the inputs

		// require that m, n are well formed (m <= n, m not zero, and m not MAX_UINT8)
		// require that v/r/s.length are equal to (m + the original temp private key sig)
		// require that the nonce is incremented by 1
		
		// removed these checks for efficiency:
		// require that the balance of the multisig wallet is gt or equal to the amount requesting to be sent
		// require that the allowance of this contract is gt or equal to the amount requesting to be sent
		//	&& ERC20(wethAddressLocal).balanceOf(multiSigWallet) >= amount
		//	&& ERC20(wethAddressLocal).allowance(multiSigWallet, address(this)) >= amount

		require( m <= allSignersPossible.length 
			&& m > 0
			&& m != 0xFF
			&& r.length == m + 1
			&& s.length == m + 1
			&& v.length == m + 1
			&& nonce == addressNonceMapping[multiSigWallet] + 1
		);

		// verify that the tempPrivKey signed the initial signature of hash keccak256(allSignersPossible, m)
		bytes32 hashVerify = keccak256("\x19Ethereum Signed Message:\n32", keccak256(allSignersPossible, m));

		// perform the ec_recover on this hash with the first v, r, s values
		address addressVerify = ecrecover(hashVerify, v[0], r[0], s[0]);

		// assert that the address from the ec_recover is equal to the multisig wallet (aka the temp private key)
		require(addressVerify == multiSigWallet);

		// verify that all the other signatures were addresses in allSignersPossible, 
		// that they all signed keccak256(amount, receiver, nonce), 
		// and that there are no duplicate signatures/addresses

		// get the new hash to verify
		hashVerify = keccak256("\x19Ethereum Signed Message:\n32", keccak256(amount, recipient, nonce));

		// make a memory mapping of (addresses => used this address?) to check for duplicates
		address[] memory usedAddresses = new address[](m);

		// loop through and ec_recover each v[] r[] s[] and verify that a correct address came out, and it wasn't a duplicate
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
		ERC20(WETHAddress).transferFrom(multiSigWallet, recipient, amount);
        
		// increment the nonce
		addressNonceMapping[multiSigWallet] = nonce;

		// done!
	}

	// removed m from generic checkAndTransferFrom, because m always = 1
	function checkAndTransferFrom1of1(address multiSigWallet, address[] allSignersPossible, uint8[] v, bytes32[] r, bytes32[] s, uint256 nonce, address recipient, uint256 amount) public {

		// can remove sanity checks for m
		require( r.length == 2
			&& s.length == 2
			&& v.length == 2
			&& nonce == addressNonceMapping[multiSigWallet] + 1
			// new check to see if there is only one address in the signers array
			&& allSignersPossible.length == 1
		);

		// for consistency, keccak256(allSignersPossible, uint8(1)) is done, where 1 is the placeholder for m
		bytes32 hashVerify = keccak256("\x19Ethereum Signed Message:\n32", keccak256(allSignersPossible, uint8(1)));

		// perform the ec_recover on this hash with the first v, r, s values
		address addressVerify = ecrecover(hashVerify, v[0], r[0], s[0]);

		// assert that the address from the ec_recover is equal to the multisig wallet (aka the temp private key)
		require(addressVerify == multiSigWallet);

		// get the new hash to verify
		hashVerify = keccak256("\x19Ethereum Signed Message:\n32", keccak256(amount, recipient, nonce));

		// get address from ec_recover
		addressVerify = ecrecover(hashVerify, v[1], r[1], s[1]);
		
		// check that address is a valid address (the one and only address in all signers array)
		require(allSignersPossible[0] == addressVerify);

		// if we've made it here, we have verified that the first signature is a valid signature of the 1of1 multisig account
		// and that the signature signed that he/she wants to transfer "amount" ERC20 token to "receiver"

		// if we've made it here, past the guantlet of asserts(), then we have verified that these are all signatures of legal addresses
		// and that they all want to transfer "amount" tokens to "receiver"

		// now all there is left to do is transfer these tokens!
		ERC20(WETHAddress).transferFrom(multiSigWallet, recipient, amount);
        
		// increment the nonce
		addressNonceMapping[multiSigWallet] = nonce;

		// done!
	}

	// removed m from generic checkAndTransferFrom, because m always = 1
	function checkAndTransferFrom2of2(address multiSigWallet, address[] allSignersPossible, uint8[] v, bytes32[] r, bytes32[] s, uint256 nonce, address recipient, uint256 amount) public {

		// can remove sanity checks for m
		require( r.length == 3
			&& s.length == 3
			&& v.length == 3
			&& nonce == addressNonceMapping[multiSigWallet] + 1
			// add new check for the signers array to verify there are 2 addresses
			&& allSignersPossible.length == 2
		);

		// same as generic situation, use 2 as place holder for m
		bytes32 hashVerify = keccak256("\x19Ethereum Signed Message:\n32", keccak256(allSignersPossible, uint8(2)));

		// perform the ec_recover on this hash with the first v, r, s values
		address addressVerify = ecrecover(hashVerify, v[0], r[0], s[0]);

		// assert that the address from the ec_recover is equal to the multisig wallet (aka the temp private key)
		require(addressVerify == multiSigWallet);

		// verify that all the other signatures were addresses in allSignersPossible, 
		// that they all signed keccak256(amount, receiver, nonce), 
		// and that there are no duplicate signatures/addresses

		// get the new hash to verify
		hashVerify = keccak256("\x19Ethereum Signed Message:\n32", keccak256(amount, recipient, nonce));

		// get the first address from ec_recover
		addressVerify = ecrecover(hashVerify, v[1], r[1], s[1]);
		
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
		ERC20(WETHAddress).transferFrom(multiSigWallet, recipient, amount);
        
		// increment the nonce
		addressNonceMapping[multiSigWallet] = nonce;

		// done!
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

	// these functions are simply for testing
	// since truffle/web3 hashes things in a different way, we can call these pure functions
	// and hash things inside the evm so we can be sure that things will hash the same
	function soliditySha3_addresses_m(address[] validAddresses, uint8 m) public pure returns(bytes32){
		return keccak256(validAddresses, m);
	}

	function soliditySha3_amount_recipient_nonce(uint256 amount, address recipient, uint256 nonce) public pure returns(bytes32){
		return keccak256(amount, recipient, nonce);
	}
	
}