pragma solidity ^0.6.0;

/**
 * @title IZippieFactoryTokenERC20 interface
 */
interface IZippieFactoryTokenERC20 {

    function deployToken(
        address admin,
        address operator,
        string calldata name, 
        string calldata symbol,
        uint8 decimals
    ) external;
}