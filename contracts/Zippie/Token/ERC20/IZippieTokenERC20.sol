pragma solidity ^0.8.0;

/**
 * @title IZippieTokenERC20 interface
 */
interface IZippieTokenERC20 {

    function mint(
        address to, 
        uint256 amount
    ) external;

}