pragma solidity ^0.6.0;

/**
 * @title IZippieSmartWalletERC721 interface
 */
interface IZippieSmartWalletERC721 {

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