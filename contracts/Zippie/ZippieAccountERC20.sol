pragma solidity ^0.5.6;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract ZippieAccountERC20 {
  address private owner;

  constructor() public {
    owner = msg.sender; // Zippie Wallet
  }

  function approve(address token) public {
    require(msg.sender == owner);
    require(IERC20(token).approve(msg.sender, 2**256-1), "Approve failed");
    selfdestruct(tx.origin); // Sponsor (any available ETH will be sent here)
  }
}