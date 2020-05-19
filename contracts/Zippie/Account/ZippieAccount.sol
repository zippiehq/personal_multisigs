pragma solidity ^0.6.0;

import "./IZippieAccount.sol";

/**
  * @title Zippie Account
  * @dev Create accounts by deploying an account contract
  * using the Create2 opcode and then allow (e.g. ERC20.approve) this contract to
  * send tokens (e.g. ERC20.tranferFrom) from the account
 */
contract ZippieAccount {

    bytes private _zippieAccountBytecode;

    constructor(bytes memory zippieAccountBytecode) public {
        _zippieAccountBytecode = zippieAccountBytecode;
    }

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
                  keccak256(_zippieAccountBytecode)
              ))
          );
    }

    /**
      * @dev Deploy account contract and approve this contract 
      * to send tokens from the account (e.g. ERC20 allowance)
      * @param token token address
      * @param salt salt value
      */
    function approveToken(address token, bytes32 salt) internal returns(address) {
        address account = createAccount(salt);
        IZippieAccount(account).approve(token);
        return account;
    }

    /**
      * @dev Deploy account contract with Create2 opcode 
      * @param salt card address
      */
    function createAccount(bytes32 salt) internal returns(address) {
      bytes memory code = _zippieAccountBytecode;
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