pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../Utils/ZippieUtils.sol";
import "../SmartWallet/ERC20/IZippieSmartWalletERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract ZippieMerchantOwner is Ownable {

    struct TransferB2B {
        address token;
        address senderMerchant;
        bytes32 senderOrderId;
        address recipientMerchant;
        bytes32 recipientOrderId;
        uint256 amount;
    }

    struct TransferB2C {
        address token;
        address senderMerchant;
        bytes32 senderOrderId;
        address recipient;
        uint256 amount;
    }

    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function transferB2B(
        TransferB2B memory transfer,
        Signature memory signature,
        address smartWallet
    ) 
        public 
        returns (bool)
    {
        bytes32 signedHash = ZippieUtils.toEthSignedMessageHash(
            keccak256(abi.encodePacked(
                "transferB2B", 
                transfer.token,
                transfer.senderMerchant,
                transfer.senderOrderId,
                transfer.recipientMerchant,
                transfer.recipientOrderId,
                transfer.amount
            ))
        );

        require(
            owner() == ecrecover(signedHash, signature.v, signature.r, signature.s), 
            "Invalid signature"
        );

        require(
            IZippieSmartWalletERC20(smartWallet).transferB2B(
                transfer.token,
                transfer.senderMerchant,
                transfer.senderOrderId,
                transfer.recipientMerchant,
                transfer.recipientOrderId,
                transfer.amount
            ),
            'ZippieMerchantOwner: TransferB2B failed'
        );

        return true;
    }

    function transferB2C(
        TransferB2C memory transfer,
        Signature memory signature,
        address smartWallet
    ) 
        public 
        returns (bool)
    {
        bytes32 signedHash = ZippieUtils.toEthSignedMessageHash(
            keccak256(abi.encodePacked(
                "transferB2C", 
                transfer.token,
                transfer.senderMerchant,
                transfer.senderOrderId,
                transfer.recipient,
                transfer.amount
            ))
        );

        require(
            owner() == ecrecover(signedHash, signature.v, signature.r, signature.s), 
            "Invalid signature"
        );

        require(
            IZippieSmartWalletERC20(smartWallet).transferB2C(
                transfer.token,
                transfer.senderMerchant,
                transfer.senderOrderId,
                transfer.recipient,
                transfer.amount
            ),
            'ZippieMerchantOwner: TransferB2C failed'
        );

        return true;
    }
} 