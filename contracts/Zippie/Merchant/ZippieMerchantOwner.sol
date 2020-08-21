pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../Utils/ZippieUtils.sol";
import "../SmartWallet/ERC20/IZippieSmartWalletERC20.sol";
import "../SmartWallet/ERC721/IZippieSmartWalletERC721.sol";
import "../Token/ERC20/IZippieTokenERC20.sol";
import "../Token/ERC721/IZippieTokenERC721.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ZippieMerchantOwner is AccessControl {

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

    struct TransferB2B_ERC721 {
        address token;
        address senderMerchant;
        bytes32 senderOrderId;
        address recipientMerchant;
        bytes32 recipientOrderId;
        uint256 tokenId;
    }

    struct TransferB2C_ERC721 {
        address token;
        address senderMerchant;
        bytes32 senderOrderId;
        address recipient;
        uint256 tokenId;
    }

    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    constructor(
        address owner, 
        address operator,
        address merchantId,
        address ensRegistry,
        address ensRegistrar,
        address ensResolver,
        bytes32 ensLabel,
        bytes32 ensNode
    ) 
        public 
    {
        // Setup inital permissions
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(keccak256("transferB2B"), owner);
        _setupRole(keccak256("transferB2C"), owner);

        // Setup ENS
        Registrar(ensRegistrar).register(ensLabel, address(this));
        Resolver(ensResolver).setAddr(ensNode, merchantId);
        ENS(ensRegistry).setResolver(ensNode, ensResolver);

        // Operator
        _setupRole(DEFAULT_ADMIN_ROLE, operator);
        _setupRole(keccak256("transferB2B"), operator);
        _setupRole(keccak256("transferB2C"), operator);
        ENS(ensRegistry).setApprovalForAll(operator, true);
        Resolver(ensResolver).setAuthorisation(ensNode, operator, true);
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
            hasRole(
                keccak256("transferB2B"),
                ecrecover(signedHash, signature.v, signature.r, signature.s)
            ), 
            "ZippieMerchantOwner: Signer missing required permission to transfer B2B"
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
            hasRole(
                keccak256("transferB2C"),
                ecrecover(signedHash, signature.v, signature.r, signature.s)
            ), 
            "ZippieMerchantOwner: Signer missing required permission to transfer B2C"
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

    function transferB2B_ERC721(
        TransferB2B_ERC721 memory transfer,
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
                transfer.tokenId
            ))
        );

        require(
            hasRole(
                keccak256("transferB2B"),
                ecrecover(signedHash, signature.v, signature.r, signature.s)
            ), 
            "ZippieMerchantOwner: Signer missing required permission to transfer B2B"
        );

        require(
            IZippieSmartWalletERC721(smartWallet).transferB2B(
                transfer.token,
                transfer.senderMerchant,
                transfer.senderOrderId,
                transfer.recipientMerchant,
                transfer.recipientOrderId,
                transfer.tokenId
            ),
            'ZippieMerchantOwner: TransferB2B ERC721 failed'
        );

        return true;
    }

    function transferB2C_ERC721(
        TransferB2C_ERC721 memory transfer,
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
                transfer.tokenId
            ))
        );

        require(
            hasRole(
                keccak256("transferB2C"),
                ecrecover(signedHash, signature.v, signature.r, signature.s)
            ), 
            "ZippieMerchantOwner: Signer missing required permission to transfer B2C"
        );

        require(
            IZippieSmartWalletERC721(smartWallet).transferB2C(
                transfer.token,
                transfer.senderMerchant,
                transfer.senderOrderId,
                transfer.recipient,
                transfer.tokenId
            ),
            'ZippieMerchantOwner: TransferB2C ERC721 failed'
        );

        return true;
    }
}

interface ENS {
    function setResolver(bytes32 node, address resolver) external;
    function setApprovalForAll(address operator, bool approved) external;
}

interface Registrar {
    function register(bytes32 label, address owner) external;
}

interface Resolver {
    function setAddr(bytes32 node, address a) external;
    function setAuthorisation(bytes32 node, address target, bool isAuthorised) external;
}