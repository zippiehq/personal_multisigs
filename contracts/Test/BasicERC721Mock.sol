pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BasicERC721Mock is ERC721 {

    constructor(address _initialAccount) ERC721("Zippie Collectables", "ZIPC") public {
        // Mint intitial collectable to creator
        _mint(_initialAccount, 1);
        _mint(_initialAccount, 2);
        _mint(_initialAccount, 3);
        _mint(_initialAccount, 4);
        _mint(_initialAccount, 5);
        _mint(_initialAccount, 6);
    }
}
