pragma solidity ^0.6.0;

/**
 * @title IZippieWalletERC721 interface
 */
interface IZippieWalletERC721 {

    function redeemBlankCheck(
        address[] calldata addresses, 
        address[] calldata signers, 
        uint8[] calldata m, 
        uint8[] calldata v, 
        bytes32[] calldata r, 
        bytes32[] calldata s, 
        uint256 tokenId, 
        bytes32[] calldata cardNonces
    ) external returns (bool);

    function getAccountAddress(
        bytes32 salt
    ) external view returns(address);
}