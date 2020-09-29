pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Pausable.sol";

contract ZippieTokenERC721 is Context, AccessControl, ERC721Burnable, ERC721Pausable {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");

    mapping (uint256 => mapping(address => address)) public approvalQueue;

    event NewTransfer(uint256 indexed tokenId, address indexed from, address indexed to);
    event ApprovedTransfer(uint256 indexed tokenId, address indexed from, address indexed to, address by);
    event RejectedTransfer(uint256 indexed tokenId, address indexed from, address indexed to, address by);

    constructor(address admin, address operator, string memory name, string memory symbol, string memory baseURI) public ERC721(name, symbol) {
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

    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ZippieTokenERC721: transfer caller is not owner nor approved");
        require(to != address(0), "ZippieTokenERC721: transfer to the zero address");
       
        _transfer(from, address(this), tokenId);
        approvalQueue[tokenId][from] = to;
        emit NewTransfer(tokenId, from, to);
    }

    function approveTransferFrom(address from, address to, uint256 tokenId) public {
        require(hasRole(APPROVER_ROLE, _msgSender()), "ZippieTokenERC721: must have approver role to approve transactions");
        require(approvalQueue[tokenId][from] == to, "ZippieTokenERC721: invalid address");
       
        _transfer(address(this), to, tokenId);
        delete approvalQueue[tokenId][from];
        emit ApprovedTransfer(tokenId, from, to, _msgSender());
    }

    function rejectTransferFrom(address from, address to, uint256 tokenId) public {
        require(hasRole(APPROVER_ROLE, _msgSender()), "ZippieTokenERC721: must have approver role to approve transactions");
        require(approvalQueue[tokenId][from] == to, "ZippieTokenERC721: invalid address");
        
        _transfer(address(this), from, tokenId);
        delete approvalQueue[tokenId][from];
        emit RejectedTransfer(tokenId, from, to, _msgSender());
    }
}