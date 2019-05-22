pragma solidity ^0.5.7;

import "../../Account/IZippieAccount.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

/**
  * @title Zippie Account ERC20
  * @dev ERC20 account contract where owner can be approved
  * to send tokens
 */
contract ZippieAccountERC20 is IZippieAccount {
  address private owner;

  constructor() public {
    owner = msg.sender; // Zippie Wallet
  }

  /**
    * @dev Approve owner to send a specific ERC20 token (max 2^256)
    * @param token token to be approved
    */
  function approve(address token) public {
    require(msg.sender == owner);
    require(IERC20(token).approve(msg.sender, 2**256-1), "Approve failed");
    selfdestruct(tx.origin); // Sponsor (any available ETH will be sent here)
  }
}