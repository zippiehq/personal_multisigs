pragma solidity ^0.6.0;

/**
 * @title IZippieWalletERC20 interface
 */
interface IZippieWalletERC20 {

    function redeemBlankCheck(
        address[] calldata addresses, 
        address[] calldata signers, 
        uint8[] calldata m, 
        uint8[] calldata v, 
        bytes32[] calldata r, 
        bytes32[] calldata s, 
        uint256 amount, 
        bytes32[] calldata cardNonces
    ) external returns (bool);

    function getAccountAddress(
        bytes32 salt
    ) external view returns(address);
}