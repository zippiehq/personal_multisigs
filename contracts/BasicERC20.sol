pragma solidity 0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract BasicERC20 is StandardToken {

    constructor(address _initialAccount) public {
        // Set initial balance to creator
        balances[_initialAccount] = 100 ether;
    }

}
