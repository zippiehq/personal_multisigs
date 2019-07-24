pragma solidity ^0.5.10;

import "./ZippieRewardTokenERC20.sol";

/**
  * @title Zippie Reward Token Factory (ERC20)
  * @dev Deploy new Zippie Reward Tokens (ERC20)
 */
contract ZippieRewardTokenERC20Factory {
  
  event TokenDeployed(address addr, address indexed creator, address indexed owner, string name, string symbol, uint8 decimals, uint256 amount);

  /**
    * @dev Deploy new token
    * @param owner will become inital owner/minter/pauser of the token
    * @param name token name
    * @param symbol token symbol
    * @param decimals token decimals
    * @param amount inital amount minted to owner
    */
  function deployToken(
    address owner,
    string memory name, 
    string memory symbol, 
    uint8 decimals, 
    uint256 amount
  ) 
    public 
  {
    ZippieRewardTokenERC20 token = new ZippieRewardTokenERC20(name, symbol, decimals);

    token.mint(owner, amount);
    token.transferOwnership(owner);
    token.addPauser(owner);
    token.renouncePauser();
    token.addMinter(owner);
    token.renounceMinter();

    emit TokenDeployed(address(token), msg.sender, owner, name, symbol, decimals, amount);
  }
  
}