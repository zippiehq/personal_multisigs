pragma solidity >0.4.99 <0.6.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract ZippieAccount {
  address public creator;

  constructor(address token, address wallet) public {
    creator = msg.sender;

    require(
        IERC20(token).approve(wallet, 1), 
        "Approve failed"
    );
  }

  function destroy(address payable recipient) public {
    require(msg.sender == creator);
    selfdestruct(recipient);
  }

  function() payable external {}
}