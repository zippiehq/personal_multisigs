pragma solidity ^0.6.0;

/**
 * @title IZippieTokenERC20 interface
 */
interface IZippieTokenERC20 {

    function mint(
        address to, 
        uint256 amount
    ) external;

}