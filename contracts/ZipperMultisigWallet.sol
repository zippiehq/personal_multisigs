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

	// declare events
	event TransferSuccess(address indexed multiSigAddress, address indexed to, uint256 amt, uint8 m, uint256 n);

	// declare global variable and mappings

	// this is needed to prevent someone from reusing signatures to create unwanted transactions and drain a multsig
	mapping (address => uint256) addressNonceMapping;

	address WETHAddress = 0x123dead;

	// empty contructor
	function ZipperMultisigWallet(){

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
		
		// store this in local for cheaper access
		address wethAddressLocal = WETHAddress;

		// save the n value
		uint256 n = allSignersPossible.length;

		// sanity check the inputs

		// require that m, n are well formed (m <= n, m not zero, and m not MAX_UINT8)
		// require that v/r/s.length are equal to (m + the original temp private key sig)
		// require that the nonce is incremented by 1
		// require that the balance of the multisig wallet is gt or equal to the amount requesting to be sent
		// require that the allowance of this contract is gt or equal to the amount requesting to be sent

		require( m <= n 
			&& m > 0
			&& m != 0xFF
			&& r.length == m + 1
			&& s.length == m + 1
			&& v.length == m + 1
			&& nonce == addressNonceMapping[multiSigWallet] + 1
			&& ERC20(wethAddressLocal).balanceOf(multiSigWallet) >= amount
			&& ERC20(wethAddressLocal).allowance(multiSigWallet, address(this)) >= amount);

		// verify that the tempPrivKey signed the initial signature of hash keccak256(allSignersPossible, m)
		bytes32 hashVerify = keccak256(allSignersPossible, m);

		// perform the ec_recover on this hash with the first v, r, s values
		address addressVerify = ecrecover(hashVerify, v[0], r[0], s[0]);

		// assert that the address from the ec_recover is equal to the multisig wallet (aka the temp private key)
		assert(addressVerify == multiSigWallet);

		// verify that all the other signatures were addresses in allSignersPossible, 
		// that they all signed keccak256(amount, receiver, nonce), 
		// and that there are no duplicate signatures/addresses

		// get the new hash to verify
		hashVerify = keccak256(amount, recipient, nonce);

		// --------------------- stack too deep here ----------------------- //

		// make a memory mapping of (addresses => used this address?) to check for duplicates
		address[] memory usedAddresses = new address[](m);

		// loop through and ec_recover each v[] r[] s[] and verify that a correct address came out, and it wasn't a duplicate
		for (uint8 i = 1; i < m + 1; i++){

			// get address from ec_recover
			addressVerify = ecrecover(hashVerify, v[i], r[i], s[i]);

			// check that address is a valid address 
			assert(checkIfAddressInArray(allSignersPossible, addressVerify));

			// check that this address has not been used before
			assert(!checkIfAddressInArray(usedAddresses, addressVerify));

			// if we've made it here, we have verified that the first signature is a valid signature of a legal account,
			// it isn't a duplicate signature,
			// and that the signature signed that he/she wants to transfer "amount" ERC20 token to "recevier"

			// push this address to the usedAddresses array
			usedAddresses[i] = addressVerify;
		}

		// if we've made it here, past the guantlet of asserts(), then we have verified that these are all signatures of legal addresses
		// and that they all want to transfer "amount" tokens to "receiver"

		// now all there is left to do is transfer these tokens!
		ERC20(wethAddressLocal).transferFrom(multiSigWallet, recipient, amount);
        
		// increment the nonce
		addressNonceMapping[multiSigWallet] = nonce;

		// and log an event that everything has successfully completed!
		TransferSuccess(multiSigWallet, recipient, amount, m, n);
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
	
}