pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../../Account/ZippieAccount.sol";
import "../../Merchant/IZippieMerchantRegistry.sol";
import "../../Wallet/ERC20/IZippieWalletERC20.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
  * @title Zippie Smart Wallet
  * @notice Transfer ERC20 from Zippie Merchant Smart Accounts
  * @dev Using ZippieAccounts (account contracts deployed with CREATE2)
 */
contract ZippieSmartWalletERC20 is ZippieAccount {

    address private _zippieMerchantRegistry;

    bytes32 public constant TRANSFER_B2B = keccak256("TRANSFER_B2B");
    bytes32 public constant TRANSFER_B2C = keccak256("TRANSFER_B2C");

    event TransferB2B(address indexed token, address indexed senderMerchant, bytes32 senderOrderId, address sender, address indexed recipientMerchant, bytes32 recipientOrderId, address recipient, uint256 amount);
    event TransferB2C(address indexed token, address indexed senderMerchant, bytes32 senderOrderId, address sender, address recipient, uint256 amount);
    event TransferC2B(address indexed token, address sender, address indexed recipientMerchant, bytes32 recipientOrderId, address recipient, uint256 amount);

    /**
     * @dev Constructs a new Zippie Smart Wallet using provided Zippie Merchant Registry
     */
    constructor(address zippieMerchantRegistry) 
        // ZippieAccountERC20.sol 
        ZippieAccount(hex'608060405234801561001057600080fd5b50600080546001600160a01b03191633179055610171806100326000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063daea85c514610030575b600080fd5b6100566004803603602081101561004657600080fd5b50356001600160a01b0316610058565b005b6000546001600160a01b0316331461006f57600080fd5b60408051600160e01b63095ea7b3028152336004820152600019602482015290516001600160a01b0383169163095ea7b39160448083019260209291908290030181600087803b1580156100c257600080fd5b505af11580156100d6573d6000803e3d6000fd5b505050506040513d60208110156100ec57600080fd5b50516101425760408051600160e51b62461bcd02815260206004820152600e60248201527f417070726f7665206661696c6564000000000000000000000000000000000000604482015290519081900360640190fd5b32fffea165627a7a7230582032c59f0247a959ee08569c8456e1b35a213a36088625adeb369ffa1a46228e3e0029') 
        public {
            _zippieMerchantRegistry = zippieMerchantRegistry;
        }


    /** 
      * @dev Transfer ERC20 tokens from merchant smart account
      * to other merchant smart account
      * @param token ERC20 token to transfer
      * @param senderMerchant sending merchant account address
      * @param senderOrderId sending merchant orderId
      * @param recipientMerchant recipient merchant account address
      * @param recipientOrderId recipient merchant orderId
      * @param amount amount to transfer
      * @return true if transfer successful 
      */
    function transferB2B(
        address token, 
        address senderMerchant, 
        bytes32 senderOrderId,
        address recipientMerchant,
        bytes32 recipientOrderId, 
        uint256 amount
    ) 
        public 
        returns (bool)
    {
        require(
            amount > 0, 
            "ZippieSmartWalletERC20: Amount must be greater than 0"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).owner(senderMerchant) != address(0), 
            "ZippieSmartWalletERC20: Merchant owner not set"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).owner(senderMerchant) == msg.sender, 
            "ZippieSmartWalletERC20: Sender not merchant owner"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).hasPermission(TRANSFER_B2B, senderMerchant), 
            "ZippieSmartWalletERC20: Sender missing required permission to tranfer B2B"
        );

        // get smart account address for sender
        address sender = getAccountAddress(
            keccak256(abi.encodePacked(senderMerchant, senderOrderId))
        );

        // get smart account address for recipient
        address recipient = getAccountAddress(
            keccak256(abi.encodePacked(recipientMerchant, recipientOrderId))
        );

        // check if smart account needs to be "created" (ERC20 approve)
        if(IERC20(token).allowance(sender, address(this)) == 0) {
            require(
                approveToken(token, keccak256(abi.encodePacked(senderMerchant, senderOrderId))) == sender, 
                "ZippieSmartWalletERC20: Token approval failed"
            );
        }

        // transfer tokens from smart account to recipient smart account
        require(
            IERC20(token).transferFrom(sender, recipient, amount), 
            "ZippieSmartWalletERC20: Transfer failed"
        );

        emit TransferB2B(
            token, 
            senderMerchant, 
            senderOrderId,
            sender,
            recipientMerchant,
            recipientOrderId, 
            recipient,
            amount
        );

        return true;
    }

    /** 
      * @dev Transfer ERC20 tokens from merchant smart account
      * to consumer (any address)
      * @param token ERC20 token to transfer
      * @param senderMerchant sending merchant account address
      * @param senderOrderId sending merchant orderId
      * @param recipient consumer recipient address
      * @param amount amount to transfer
      * @return true if transfer successful 
      */
    function transferB2C(
        address token, 
        address senderMerchant, 
        bytes32 senderOrderId,
        address recipient,
        uint256 amount
    ) 
        public 
        returns (bool)
    {
        require(
            amount > 0, 
            "ZippieSmartWalletERC20: Amount must be greater than 0"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).owner(senderMerchant) != address(0), 
            "ZippieSmartWalletERC20: Merchant owner not set"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).owner(senderMerchant) == msg.sender, 
            "ZippieSmartWalletERC20: Sender not merchant owner"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).hasPermission(TRANSFER_B2C, senderMerchant), 
            "ZippieSmartWalletERC20: Sender missing required permission to tranfer B2C"
        );

        // get smart account address for sender
        address sender = getAccountAddress(
            keccak256(abi.encodePacked(senderMerchant, senderOrderId))
        );

        // check if smart account needs to be "created" (ERC20 approve)
        if(IERC20(token).allowance(sender, address(this)) == 0) {
            require(
                approveToken(token, keccak256(abi.encodePacked(senderMerchant, senderOrderId))) == sender, 
                "ZippieSmartWalletERC20: Token approval failed"
            );
        }

        // transfer tokens from smart account to recipient
        require(
            IERC20(token).transferFrom(sender, recipient, amount), 
            "ZippieSmartWalletERC20: Transfer failed"
        );

        emit TransferB2C(
            token, 
            senderMerchant, 
            senderOrderId,
            sender,
            recipient,
            amount
        );

        return true;
    }

    /**  
      * @dev See ZippieWalletWalletERC20
      */
    struct BlankCheck {
        address[] addresses;
        address[] signers;
        uint8[] m; 
        uint8[] v; 
        bytes32[] r; 
        bytes32[] s; 
        uint256 amount; 
        bytes32[] cardNonces;
    }

    /**  
      * @dev Redeem ZippieWalletWalletERC20 blank check to merchant smart account 
      * @param payment ZippieWalletWalletERC20 blank check
      * @param recipientMerchant recipient merchant account address
      * @param recipientOrderId recipient merchant orderId
      * @return true if transfer successful
      */
    function redeemBlankCheckToMerchant(
        BlankCheck memory payment,
        address recipientMerchant,
        bytes32 recipientOrderId, 
        address wallet
    ) 
        public 
        returns (bool)
    {
        require(
            payment.addresses[1] == getAccountAddress(keccak256(abi.encodePacked(recipientMerchant, recipientOrderId))),
            'ZippieSmartWalletERC20: Invalid recipient address'
        );

        require(
            IZippieWalletERC20(wallet).redeemBlankCheck(
                payment.addresses, 
                payment.signers, 
                payment.m,
                payment.v, 
                payment.r, 
                payment.s, 
                payment.amount, 
                payment.cardNonces
            ),
            'ZippieSmartWalletERC20: Transfer failed'
        );

        address sender = IZippieWalletERC20(wallet).getAccountAddress(
            keccak256(abi.encodePacked(payment.signers, payment.m))
        );

        emit TransferC2B(
            payment.addresses[0], 
            sender,
            recipientMerchant,
            recipientOrderId, 
            payment.addresses[1],
            payment.amount
        );
            
        return true;
    }
}