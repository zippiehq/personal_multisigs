pragma solidity ^0.4.24;

interface IHashNonce {
    function isNonceUsed(address signer, bytes32 nonce) external returns (bool);

    function useNonce(address signer, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external returns(bool);
}