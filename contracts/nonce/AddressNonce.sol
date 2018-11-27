pragma solidity >=0.5.0 <0.6.0;

import "./IAddressNonce.sol";

contract AddressNonce is IAddressNonce {

    mapping(address => bool) private _usedNonces;

    function isNonceUsed(address nonce) public view returns (bool) {
        return _usedNonces[nonce];
    }

    function useNonce(address signer, bytes32 data, uint8 v, bytes32 r, bytes32 s) public returns(bool) {
        require(_usedNonces[signer] == false, "Nonce already used");
        require(signer == ecrecover(data, v, r, s), "Invalid signature");
        _usedNonces[signer] = true;
        return true;
    }
}