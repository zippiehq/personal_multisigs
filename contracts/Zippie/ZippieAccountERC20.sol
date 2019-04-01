pragma solidity ^0.5.6;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract ZippieAccountERC20 {
  constructor(address token) public {
    require(IERC20(token).approve(msg.sender, 2**256-1), "Approve failed");
    //selfdestruct(msg.sender);
    selfdestruct(tx.origin);
    //selfdestruct(address(0)); 
  }
}