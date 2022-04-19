pragma solidity ^0.8.0;

/**
 * @title IZippieSmartWalletERC20 interface
 */
interface IZippieSmartWalletERC20 {

    function transferB2B(
        address token, 
        address senderMerchant, 
        bytes32 senderOrderId,
        address recipientMerchant,
        bytes32 recipientOrderId, 
        uint256 amount
    ) external returns (bool);

    function transferB2C(
        address token, 
        address senderMerchant, 
        bytes32 senderOrderId,
        address recipient,
        uint256 amount
    ) external returns (bool);
}