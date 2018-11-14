pragma solidity ^0.4.24;

interface IAddressNonce {
    function isNonceUsed(address signer, address nonce) external returns (bool);

    function useNonce(address signer, bytes32 data, uint8 v, bytes32 r, bytes32 s) external returns(bool);
}