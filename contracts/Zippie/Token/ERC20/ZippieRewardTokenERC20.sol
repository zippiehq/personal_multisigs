pragma solidity ^0.5.9;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/** 
  * @title Zippie Reward Token ERC20
  * @dev ERC20 token used for Zippie Rewards
  * Token details can be updated by owner
 */
contract ZippieRewardTokenERC20 is ERC20, ERC20Mintable, ERC20Burnable, ERC20Pausable, Ownable {
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals)
        Ownable()
        ERC20Pausable()
        ERC20Burnable()
        ERC20Mintable()
        public 
        {
          _name = name;
          _symbol = symbol;
          _decimals = decimals;
        }

    /**
      * @dev Update token details
      * @param name token name
      * @param symbol token symbol
      */
    function updateERC20Details(string memory name, string memory symbol) public onlyOwner {
        _name = name;
        _symbol = symbol;
    }

    /**
     * @return the name of the token.
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * @return the symbol of the token.
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * @return the number of decimals of the token.
     */
    function decimals() public view returns (uint8) {
        return _decimals;
    }

}