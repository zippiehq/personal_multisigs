pragma solidity >=0.5.0 <0.6.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract BasicERC20Mock is ERC20 {

    constructor(address _initialAccount) public {
        // Set initial balance to creator
        _mint(_initialAccount, 100 ether);
    }

}
