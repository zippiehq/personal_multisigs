pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract BasicERC20MockOwner is ERC20, ERC20Detailed {

    constructor() ERC20Detailed("Zippie", "ZIPT", 18) public {
        // Set initial balance to creator
        _mint(msg.sender, 100 ether);
    }

}
