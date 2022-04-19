pragma solidity ^0.6.0;

import "./ZippieTokenERC20.sol";

/**
  * @title Zippie Token Factory (ERC20)
  * @dev Deploy new Zippie Token (ERC20)
 */
contract ZippieTokenFactoryERC20 {
  
  event TokenDeployedERC20(address addr, address indexed creator, address indexed admin, string name, string symbol, uint8 decimals);

  /**
    * @dev Deploy new token
    * @param admin will become inital admin/minter/pauser of the token
    * @param operator will become inital admin/minter/pauser of the token
    * @param name token name
    * @param symbol token symbol
    */
  function deployToken(
    address admin,
    address operator,
    string memory name, 
    string memory symbol,
    uint8 decimals
  ) 
    public 
  {
    ZippieTokenERC20 token = new ZippieTokenERC20(admin, operator, name, symbol, decimals);
    emit TokenDeployedERC20(address(token), msg.sender, admin, name, symbol, decimals);
  }
}