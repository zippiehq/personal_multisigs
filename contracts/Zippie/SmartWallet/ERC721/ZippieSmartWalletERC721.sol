pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../../Account/ZippieAccount.sol";
import "../../Merchant/IZippieMerchantRegistry.sol";
import "../../Wallet/ERC721/IZippieWalletERC721.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
  * @title Zippie Smart Wallet
  * @notice Transfer ERC721 from Zippie Merchant Smart Accounts
  * @dev Using ZippieAccounts (account contracts deployed with CREATE2)
 */
contract ZippieSmartWalletERC721 is ZippieAccount {

    address private _zippieMerchantRegistry;

    bytes32 public constant TRANSFER_B2B = keccak256("TRANSFER_B2B");
    bytes32 public constant TRANSFER_B2C = keccak256("TRANSFER_B2C");

    event TransferB2B(address indexed token, address indexed senderMerchant, bytes32 senderOrderId, address sender, address indexed recipientMerchant, bytes32 recipientOrderId, address recipient, uint256 tokenId);
    event TransferB2C(address indexed token, address indexed senderMerchant, bytes32 senderOrderId, address sender, address recipient, uint256 tokenId);
    event TransferC2B(address indexed token, address sender, address indexed recipientMerchant, bytes32 recipientOrderId, address recipient, uint256 tokenId);

    /**
     * @dev Constructs a new Zippie Smart Wallet using provided Zippie Merchant Registry
     */
    constructor(address zippieMerchantRegistry) 
        // ZippieAccountERC721.sol 
        ZippieAccount(hex'608060405234801561001057600080fd5b50600080546001600160a01b0319163317905560ff806100316000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063daea85c514602d575b600080fd5b605060048036036020811015604157600080fd5b50356001600160a01b03166052565b005b6000546001600160a01b03163314606857600080fd5b60408051600160e01b63a22cb4650281523360048201526001602482015290516001600160a01b0383169163a22cb46591604480830192600092919082900301818387803b15801560b857600080fd5b505af115801560cb573d6000803e3d6000fd5b503292505050fffea165627a7a72305820138a39f8dcc74909958a7c9a3debcc975c1b1527953c47473594aa49882499790029')
        public {
            _zippieMerchantRegistry = zippieMerchantRegistry;
        }


    /** 
      * @dev Transfer ERC721 tokens from merchant smart account
      * to other merchant smart account
      * @param token ERC721 token to transfer
      * @param senderMerchant sending merchant account address
      * @param senderOrderId sending merchant orderId
      * @param recipientMerchant recipient merchant account address
      * @param recipientOrderId recipient merchant orderId
      * @param tokenId non-fungible token (NFT) to transfer
      * @return true if transfer successful 
      */
    function transferB2B(
        address token, 
        address senderMerchant, 
        bytes32 senderOrderId,
        address recipientMerchant,
        bytes32 recipientOrderId, 
        uint256 tokenId
    ) 
        public 
        returns (bool)
    {
        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).owner(senderMerchant) != address(0), 
            "ZippieSmartWalletERC721: Merchant owner not set"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).owner(senderMerchant) == msg.sender, 
            "ZippieSmartWalletERC721: Sender not merchant owner"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).hasPermission(TRANSFER_B2B, senderMerchant), 
            "ZippieSmartWalletERC721: Sender missing required permission to transfer B2B"
        );

        // get smart account address for sender
        address sender = getAccountAddress(
            keccak256(abi.encodePacked(senderMerchant, senderOrderId))
        );

        // get smart account address for recipient
        address recipient = getAccountAddress(
            keccak256(abi.encodePacked(recipientMerchant, recipientOrderId))
        );

        // check if smart account needs to be "created" (ERC721 isApprovedForAll)
        if(IERC721(token).isApprovedForAll(sender, address(this)) == false) {
            require(
                approveToken(token, keccak256(abi.encodePacked(senderMerchant, senderOrderId))) == sender, 
                "ZippieSmartWalletERC721: Token approval failed"
            );
        }

        // transfer NFT from smart account to recipient smart account
        IERC721(token).transferFrom(sender, recipient, tokenId);

        emit TransferB2B(
            token, 
            senderMerchant, 
            senderOrderId,
            sender,
            recipientMerchant,
            recipientOrderId, 
            recipient,
            tokenId
        );

        return true;
    }

    /** 
      * @dev Transfer ERC721 tokens from merchant smart account
      * to consumer (any address)
      * @param token ERC721 token to transfer
      * @param senderMerchant sending merchant account address
      * @param senderOrderId sending merchant orderId
      * @param recipient consumer recipient address
      * @param tokenId non-fungible token (NFT) to transfer
      * @return true if transfer successful 
      */
    function transferB2C(
        address token, 
        address senderMerchant, 
        bytes32 senderOrderId,
        address recipient,
        uint256 tokenId
    ) 
        public 
        returns (bool)
    {
        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).owner(senderMerchant) != address(0), 
            "ZippieSmartWalletERC721: Merchant owner not set"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).owner(senderMerchant) == msg.sender, 
            "ZippieSmartWalletERC721: Sender not merchant owner"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).hasPermission(TRANSFER_B2C, senderMerchant), 
            "ZippieSmartWalletERC721: Sender missing required permission to transfer B2C"
        );

        // get smart account address for sender
        address sender = getAccountAddress(
            keccak256(abi.encodePacked(senderMerchant, senderOrderId))
        );

        // check if smart account needs to be "created" (ERC721 isApprovedForAll)
        if(IERC721(token).isApprovedForAll(sender, address(this)) == false) {
            require(
                approveToken(token, keccak256(abi.encodePacked(senderMerchant, senderOrderId))) == sender, 
                "ZippieSmartWalletERC721: Token approval failed"
            );
        }

        // transfer NFT from smart account to recipient
        IERC721(token).transferFrom(sender, recipient, tokenId);

        emit TransferB2C(
            token, 
            senderMerchant, 
            senderOrderId,
            sender,
            recipient,
            tokenId
        );

        return true;
    }

    /**  
      * @dev See ZippieWalletWalletERC721
      */
    struct BlankCheck {
        address[] addresses;
        address[] signers;
        uint8[] m; 
        uint8[] v; 
        bytes32[] r; 
        bytes32[] s; 
        uint256 tokenId; 
        bytes32[] cardNonces;
    }

    /**  
      * @dev Redeem ZippieWalletWalletERC721 blank check to merchant smart account 
      * @param payment ZippieWalletWalletERC721 blank check
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
            'ZippieSmartWalletERC721: Invalid recipient address'
        );

        require(
            IZippieWalletERC721(wallet).redeemBlankCheck(
                payment.addresses, 
                payment.signers, 
                payment.m,
                payment.v, 
                payment.r, 
                payment.s, 
                payment.tokenId, 
                payment.cardNonces
            ),
            'ZippieSmartWalletERC721: Transfer failed'
        );

        address sender = IZippieWalletERC721(wallet).getAccountAddress(
            keccak256(abi.encodePacked(payment.signers, payment.m))
        );

        emit TransferC2B(
            payment.addresses[0], 
            sender,
            recipientMerchant,
            recipientOrderId, 
            payment.addresses[1],
            payment.tokenId
        );
            
        return true;
    }
}