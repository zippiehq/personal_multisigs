pragma solidity ^0.6.0;

import "./ZippieTokenERC721.sol";

/**
  * @title Zippie Token Factory (ERC721)
  * @dev Deploy new Zippie Token (ERC721)
 */
contract ZippieTokenFactoryERC721 {
  
  event TokenDeployedERC721(address addr, address indexed creator, address indexed admin, string name, string symbol, string baseURI);

  /**
    * @dev Deploy new token
    * @param admin will become inital admin/minter/pauser of the token
    * @param operator will become inital admin/minter/pauser of the token
    * @param name token name
    * @param symbol token symbol
    * @param baseURI token base uri
    */
  function deployToken(
    address admin,
    address operator,
    string memory name, 
    string memory symbol,
    string memory baseURI
  ) 
    public 
  {
    ZippieTokenERC721 token = new ZippieTokenERC721(admin, operator, name, symbol, baseURI);
    emit TokenDeployedERC721(address(token), msg.sender, admin, name, symbol, baseURI);
  }
}