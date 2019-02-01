pragma solidity >0.4.99 <0.6.0;

contract ZippieAccount {

    // ZippieAccountERC20.sol
    bytes zippieAccountBytecode = hex'608060405234801561001057600080fd5b506040516020806101788339810180604052602081101561003057600080fd5b5051604080517f095ea7b300000000000000000000000000000000000000000000000000000000815233600482015260001960248201529051600160a060020a0383169163095ea7b39160448083019260209291908290030181600087803b15801561009b57600080fd5b505af11580156100af573d6000803e3d6000fd5b505050506040513d60208110156100c557600080fd5b5051151561013457604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600e60248201527f417070726f7665206661696c6564000000000000000000000000000000000000604482015290519081900360640190fd5b506035806101436000396000f3fe6080604052600080fdfea165627a7a72305820026d19da246fcc186d0cf6dfd9ccc6937823b76c6bd58e012ccc23286aba54990029';

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
          if iszero(extcodesize(addr)) {
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