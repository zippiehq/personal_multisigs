pragma solidity ^0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistedRole.sol";


/**
 * @title ERC20 Whitelisted Transfer
 * @dev ERC20 where tokens can only be transfered to or from whitelisted addresses added by the owner
 */
contract ERC20WhitelistedTransfer is ERC20, WhitelistedRole {

    /**
      * @dev See `ERC20.transfer`.
      */
    function transfer(address to, uint256 value) public onlyWhitelisted returns (bool) {
        require(isWhitelisted(to), "to address not whitelisted");
        return super.transfer(to, value);
    }

   /**
     * @dev See `ERC20.transferFrom`.
     */
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(isWhitelisted(from), "from address not whitelisted");
        require(isWhitelisted(to), "to address not whitelisted");
        return super.transferFrom(from, to, value);
    }
}