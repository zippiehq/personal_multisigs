pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Pausable.sol";

// Modified version of openzeppelin ERC721PresetMinterPauserAutoId

contract ZippieTokenERC721 is Context, AccessControl, ERC721Burnable, ERC721Pausable {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    constructor(address admin, address operator, string memory name, string memory symbol, string memory baseURI) public ERC721(name, symbol) {
        // Owner
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);
        _setupRole(PAUSER_ROLE, admin);

        // Operator
        _setupRole(DEFAULT_ADMIN_ROLE, operator);
        _setupRole(MINTER_ROLE, operator);
        _setupRole(PAUSER_ROLE, operator);

        _setBaseURI(baseURI);
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function mint(address to, uint256 tokenId, string memory tokenURI) public virtual {
        require(hasRole(MINTER_ROLE, _msgSender()), "ZippieTokenERC721: must have minter role to mint");

        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }

    function pause() public virtual {
        require(hasRole(PAUSER_ROLE, _msgSender()), "ZippieTokenERC721: must have pauser role to pause");
        _pause();
    }

    function unpause() public virtual {
        require(hasRole(PAUSER_ROLE, _msgSender()), "ZippieTokenERC721: must have pauser role to unpause");
        _unpause();
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721, ERC721Pausable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}