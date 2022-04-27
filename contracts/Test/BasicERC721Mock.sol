pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract BasicERC721Mock is ERC721, ERC721Enumerable {

    constructor(address _initialAccount) ERC721("Zippie Collectables", "ZIPC") public {
        // Mint intitial collectable to creator
        _mint(_initialAccount, 1);
        _mint(_initialAccount, 2);
        _mint(_initialAccount, 3);
        _mint(_initialAccount, 4);
        _mint(_initialAccount, 5);
        _mint(_initialAccount, 6);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
