pragma solidity ^0.6.0;

import "../../Account/ZippieAccount.sol";
import "../../Merchant/IZippieMerchantRegistry.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ZippieSmartWalletERC20 is ZippieAccount {

    address private _zippieMerchantRegistry;

    bytes32 public constant TRANSFER_B2B = keccak256("TRANSFER_B2B");

    constructor(address zippieMerchantRegistry) 
        // ZippieAccountERC20.sol 
        ZippieAccount(hex'608060405234801561001057600080fd5b50600080546001600160a01b03191633179055610171806100326000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063daea85c514610030575b600080fd5b6100566004803603602081101561004657600080fd5b50356001600160a01b0316610058565b005b6000546001600160a01b0316331461006f57600080fd5b60408051600160e01b63095ea7b3028152336004820152600019602482015290516001600160a01b0383169163095ea7b39160448083019260209291908290030181600087803b1580156100c257600080fd5b505af11580156100d6573d6000803e3d6000fd5b505050506040513d60208110156100ec57600080fd5b50516101425760408051600160e51b62461bcd02815260206004820152600e60248201527f417070726f7665206661696c6564000000000000000000000000000000000000604482015290519081900360640190fd5b32fffea165627a7a7230582032c59f0247a959ee08569c8456e1b35a213a36088625adeb369ffa1a46228e3e0029') 
        public {
            _zippieMerchantRegistry = zippieMerchantRegistry;
        }

    // XXX: Add docs
    function transferPayment(
        address token, 
        address recipient, 
        address merchant, 
        bytes32 orderId,
        uint256 amount
    ) 
        public 
        returns (bool)
    {
        require(
            amount > 0, 
            "Amount must be greater than 0"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).merchantOwner(merchant) != address(0), 
            "Merchant owner not set"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).merchantOwner(merchant) == msg.sender, 
            "Sender not merchant owner"
        );

        require(
            IZippieMerchantRegistry(_zippieMerchantRegistry).hasPremission(TRANSFER_B2B, merchant), 
            "Missing required premission"
        );

        // get smart account address
        address accountAddress = getAccountAddress(
            keccak256(abi.encodePacked(merchant, orderId))
        );

        // check if smart account needs to be "created" (ERC20 approve)
        if(IERC20(token).allowance(accountAddress, address(this)) == 0) {
            require(
                approveToken(token, keccak256(abi.encodePacked(merchant, orderId))) == accountAddress, 
                "Token approval failed"
            );
        }

        // transfer tokens from smart account to recipient address
        require(
            IERC20(token).transferFrom(accountAddress, recipient, amount), 
            "Transfer failed"
        );
        return true;
    }
}