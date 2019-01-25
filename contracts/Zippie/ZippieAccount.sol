pragma solidity >0.4.99 <0.6.0;

contract ZippieAccount {

    // ZippieAccountERC20.sol
    bytes zippieAccountBytecode = hex'608060405234801561001057600080fd5b506040516040806101808339810180604052604081101561003057600080fd5b508051602091820151604080517f095ea7b30000000000000000000000000000000000000000000000000000000081523360048201526000196024820152905192939192600160a060020a0385169263095ea7b392604480820193918290030181600087803b1580156100a257600080fd5b505af11580156100b6573d6000803e3d6000fd5b505050506040513d60208110156100cc57600080fd5b5051151561013b57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600e60248201527f417070726f7665206661696c6564000000000000000000000000000000000000604482015290519081900360640190fd5b505060358061014b6000396000f3fe6080604052600080fdfea165627a7a723058206a6920da9d5115fab97f0432e006c72f048009ed91e615c82be26446351852860029';

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
      return abi.encodePacked(zippieAccountBytecode, abi.encode(token), abi.encode(address(this)));
    }

    function bytes32ToAddress(bytes32 addressHash) internal pure returns (address) {
        return address(uint160(uint256(addressHash)));
    }
}