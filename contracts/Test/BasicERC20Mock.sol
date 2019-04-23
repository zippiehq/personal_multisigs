pragma solidity ^0.5.7;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract BasicERC20Mock is ERC20, ERC20Detailed {

    constructor(address _initialAccount) ERC20Detailed("Zippie", "ZIPT", 18) public {
        // Set initial balance to creator
        _mint(_initialAccount, 100 ether);
    }

}
