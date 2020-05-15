pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BasicERC20Mock is ERC20 {

    constructor(address _initialAccount) ERC20("Zippie", "ZIPT") public {
        _setupDecimals(18);
        // Set initial balance to creator
        _mint(_initialAccount, 100 ether);
    }

}
