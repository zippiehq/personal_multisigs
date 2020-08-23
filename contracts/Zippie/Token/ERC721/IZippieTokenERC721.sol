pragma solidity ^0.6.0;

/**
 * @title IZippieTokenERC721 interface
 */
interface IZippieTokenERC721 {

    function mint(
        address to, 
        uint256 tokenId,
        string calldata tokenURI
    ) external;

}