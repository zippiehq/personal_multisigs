pragma solidity ^0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "./ERC20DetailedMutable.sol";
import "./ERC20WhitelistedTransfer.sol";

/** 
  * @title Zippie Internal Token ERC20
  * @dev ERC20 token for internal usage
  * tokens can only be transfered to or from whitelisted addresses added by the owner
  */
contract ZippieInternalTokenERC20 is ERC20, ERC20Mintable, ERC20Burnable, ERC20Pausable, ERC20DetailedMutable, ERC20WhitelistedTransfer {
    constructor(string memory name, string memory symbol, uint8 decimals)
        ERC20Pausable()
        ERC20Burnable()
        ERC20Mintable()
        ERC20DetailedMutable(name, symbol, decimals)
        ERC20WhitelistedTransfer()
        public 
    {}
}