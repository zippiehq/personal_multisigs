pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BasicERC20Mock is ERC20 {

    constructor(address _initialAccount) ERC20("Zippie", "ZIPT") public {
        // Set initial balance to creator
        _mint(_initialAccount, 100 ether);
    }

}
