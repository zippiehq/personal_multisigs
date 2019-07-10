pragma solidity ^0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "./ERC20DetailedMutable.sol";

/** 
  * @title Zippie Reward Token ERC20
  * @dev ERC20 token used for Zippie Rewards
  * Token details can be updated by owner
  */
contract ZippieRewardTokenERC20 is ERC20, ERC20Mintable, ERC20Burnable, ERC20Pausable, ERC20DetailedMutable {
    constructor(string memory name, string memory symbol, uint8 decimals)
        ERC20Pausable()
        ERC20Burnable()
        ERC20Mintable()
        ERC20DetailedMutable(name, symbol, decimals)
        public 
    {}
}