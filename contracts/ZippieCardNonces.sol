pragma solidity ^0.5.0;

import "./IZippieCardNonces.sol";

contract ZippieCardNonces is IZippieCardNonces {

    mapping (address => mapping(bytes32 => bool)) private _usedNonces;

    function isNonceUsed(address signer, bytes32 nonce) public view returns (bool) {
        return _usedNonces[signer][nonce];
    }

    function useNonce(address signer, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) public returns(bool) {
        require(_usedNonces[signer][nonce] == false, "Nonce already used");
        require(signer == ecrecover(nonce, v, r, s), "Invalid signature");
        _usedNonces[signer][nonce] = true;
        return true;
    }
}