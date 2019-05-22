pragma solidity ^0.5.7;
/**
 * @title IZippieAccount interface
 * @dev this function must approve msg.sender to send tokens on behalf of the account
 */
interface IZippieAccount {
    function approve(address token) external;
}