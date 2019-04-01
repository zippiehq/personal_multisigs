pragma solidity ^0.5.6;

contract ZippieAccount {

    // ZippieAccountERC20.sol
    bytes zippieAccountBytecode = hex'608060405234801561001057600080fd5b506040516020806101368339810180604052602081101561003057600080fd5b5051604080517f095ea7b3000000000000000000000000000000000000000000000000000000008152336004820152600019602482015290516001600160a01b0383169163095ea7b39160448083019260209291908290030181600087803b15801561009b57600080fd5b505af11580156100af573d6000803e3d6000fd5b505050506040513d60208110156100c557600080fd5b505161013257604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600e60248201527f417070726f7665206661696c6564000000000000000000000000000000000000604482015290519081900360640190fd5b32fffe';

    function getAccountAddress(address token, bytes32 salt) public view returns(address) {
      return 
          bytes32ToAddress(
              keccak256(abi.encodePacked(
                  byte(0xff), 
                  address(this), 
                  salt, 
                  keccak256(getBytecode(token))
              ))
          );
    }

    function createAccount(address token, bytes32 salt) public returns(address) {
      bytes memory code = getBytecode(token);
      address payable addr;
      assembly {
          addr := create2(0, add(code, 0x20), mload(code), salt)
          if gt(extcodesize(addr), 0) {
              revert(0, 0)
          }
      }
      return addr;
    }

    function getBytecode(address token) internal view returns(bytes memory) {
      return abi.encodePacked(zippieAccountBytecode, abi.encode(token));
    }

    function bytes32ToAddress(bytes32 addressHash) internal pure returns (address) {
        return address(uint160(uint256(addressHash)));
    }
}