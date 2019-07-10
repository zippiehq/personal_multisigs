pragma solidity ^0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title ERC20 Detailed Mutable
 * @dev This is a modified version of the openzeppelin ERC20Detailed contract, 
 * where name and symbol can be updated by the owner
 */
contract ERC20DetailedMutable is IERC20, Ownable {
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    constructor (string memory name, string memory symbol, uint8 decimals) 
        Ownable()
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
