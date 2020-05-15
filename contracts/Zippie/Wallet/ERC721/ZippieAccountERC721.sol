pragma solidity ^0.6.0;

import "../../Account/IZippieAccount.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
  * @title Zippie Account ERC721
  * @dev ERC721 account contract where owner can be approved
  * to send tokens
 */
contract ZippieAccountERC721 is IZippieAccount {
  address private owner;

  constructor() public {
    owner = msg.sender; // Zippie Wallet
  }

  /**
    * @dev Approve owner to send a specific ERC721 token (all tokenId's)
    * @param token token to be approved
    */
  function approve(address token) public override {
    require(msg.sender == owner);
    IERC721(token).setApprovalForAll(msg.sender, true);
    selfdestruct(tx.origin); // Sponsor (any available ETH will be sent here)
  }
}