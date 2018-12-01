pragma solidity ^0.5.0;
/**
 * @title ZippieCardNonce interface
 * @dev check if nonce has been used or mark nonce as used
 */
interface IZippieCardNonces {
    function isNonceUsed(address signer, bytes32 nonce) 
        external returns (bool);

    function useNonce(address signer, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) 
        external returns(bool);
}