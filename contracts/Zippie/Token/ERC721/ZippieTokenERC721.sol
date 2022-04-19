pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract ZippieTokenERC721 is Context, AccessControlEnumerable, ERC721Enumerable, ERC721Burnable, ERC721Pausable, ERC721URIStorage {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");

    string private _baseTokenURI;

    mapping (uint256 => mapping(address => address)) public approvalQueue;

    event NewTransfer(uint256 indexed tokenId, address indexed from, address indexed to);
    event ApprovedTransfer(uint256 indexed tokenId, address indexed from, address indexed to, address by, bytes metadata);
    event RejectedTransfer(uint256 indexed tokenId, address indexed from, address indexed to, address by, bytes metadata);

    constructor(address admin, address operator, string memory name, string memory symbol, string memory baseURI) public ERC721(name, symbol) {
        _baseTokenURI = baseURI;
        
        // Owner
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);
        _setupRole(PAUSER_ROLE, admin);
        _setupRole(APPROVER_ROLE, admin);

        // Operator
        _setupRole(DEFAULT_ADMIN_ROLE, operator);
        _setupRole(MINTER_ROLE, operator);
        _setupRole(PAUSER_ROLE, operator);
        _setupRole(APPROVER_ROLE, operator);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function baseURI() public view returns (string memory) {
        return _baseURI();
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

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721, ERC721Enumerable, ERC721Pausable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ZippieTokenERC721: transfer caller is not owner nor approved");
        require(to != address(0), "ZippieTokenERC721: transfer to the zero address");
       
        _transfer(from, address(this), tokenId);
        approvalQueue[tokenId][from] = to;
        emit NewTransfer(tokenId, from, to);
    }

    function approveTransferFrom(address from, address to, uint256 tokenId, bytes memory metadata) public {
        require(hasRole(APPROVER_ROLE, _msgSender()), "ZippieTokenERC721: must have approver role to approve transactions");
        require(approvalQueue[tokenId][from] == to, "ZippieTokenERC721: invalid address");
       
        _transfer(address(this), to, tokenId);
        delete approvalQueue[tokenId][from];
        emit ApprovedTransfer(tokenId, from, to, _msgSender(), metadata);
    }

    function rejectTransferFrom(address from, address to, uint256 tokenId, bytes memory metadata) public {
        require(hasRole(APPROVER_ROLE, _msgSender()), "ZippieTokenERC721: must have approver role to approve transactions");
        require(approvalQueue[tokenId][from] == to, "ZippieTokenERC721: invalid address");
        
        _transfer(address(this), from, tokenId);
        delete approvalQueue[tokenId][from];
        emit RejectedTransfer(tokenId, from, to, _msgSender(), metadata);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControlEnumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}