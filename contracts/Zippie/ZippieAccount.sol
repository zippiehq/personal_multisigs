pragma solidity ^0.5.6;

import "./ZippieAccountERC20.sol";

/**
  * @title Zippie Account
  * @dev Create ERC20 accounts by deploying an account contract
  * using the Create2 opcode and then allow (ERC20.approve) this contract to
  * send tokens (ERC20.tranferFrom) from the account
 */
contract ZippieAccount {

    // ZippieAccountERC20.sol (bytecode for the contract)
    bytes zippieAccountBytecode = hex'608060405234801561001057600080fd5b50600080546001600160a01b03191633179055610171806100326000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063daea85c514610030575b600080fd5b6100566004803603602081101561004657600080fd5b50356001600160a01b0316610058565b005b6000546001600160a01b0316331461006f57600080fd5b60408051600160e01b63095ea7b3028152336004820152600019602482015290516001600160a01b0383169163095ea7b39160448083019260209291908290030181600087803b1580156100c257600080fd5b505af11580156100d6573d6000803e3d6000fd5b505050506040513d60208110156100ec57600080fd5b50516101425760408051600160e51b62461bcd02815260206004820152600e60248201527f417070726f7665206661696c6564000000000000000000000000000000000000604482015290519081900360640190fd5b32fffea165627a7a72305820ad8e31610e420bf15c9c669d7602749043be39d3c7efa6e46e63f762b1515e750029';
    
    /**
      * @dev Get account address (contract deployed with create2 opcode)
      * @param salt salt value
      */
    function getAccountAddress(bytes32 salt) public view returns(address) {
      return 
          bytes32ToAddress(
              keccak256(abi.encodePacked(
                  byte(0xff), 
                  address(this), 
                  salt, 
                  keccak256(zippieAccountBytecode)
              ))
          );
    }

    /**
      * @dev Deploy account contract and approve this contract 
      * to send tokens from the account (ERC20 allowance)
      * @param token token address
      * @param salt salt value
      */
    function approveToken(address token, bytes32 salt) internal returns(address) {
        address account = createAccount(salt);
        ZippieAccountERC20(account).approve(token);
        return account;
    }

    /**
      * @dev Deploy account contract with Create2 opcode 
      * @param salt card address
      */
    function createAccount(bytes32 salt) internal returns(address) {
      bytes memory code = zippieAccountBytecode;
      address payable addr;
      assembly {
          addr := create2(0, add(code, 0x20), mload(code), salt)
          if iszero(extcodesize(addr)) {
              revert(0, 0)
          }
      }
      return addr;
    }

    /**
      * @dev Converts last 20 bytes from bytes32 to an address
      * @param addressHash hash to be converted to address 
      */
    function bytes32ToAddress(bytes32 addressHash) internal pure returns (address) {
        return address(uint160(uint256(addressHash)));
    }
}