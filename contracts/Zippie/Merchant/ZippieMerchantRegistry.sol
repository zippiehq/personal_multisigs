pragma solidity ^0.6.0;

import "./IZippieMerchantRegistry.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ZippieMerchantRegistry is IZippieMerchantRegistry, AccessControl {

    struct Merchant {
        address owner;
        bytes contentHash;
    }

    mapping (address => Merchant) private _merchantOwners;
    event MerchantChanged(address indexed merchant, address indexed owner, bytes contentHash);

    constructor() public {
      _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setMerchant(
        address merchant, 
        address owner,
        bytes memory contentHash
    ) 
        public 
        override 
        returns (bool) 
    {
        require(
          hasRole(DEFAULT_ADMIN_ROLE, msg.sender), 
          "ZippieMerchantRegistry: Caller is not admin"
        );
        
        emit MerchantChanged(merchant, owner, contentHash);
        _merchantOwners[merchant].owner = owner;
        _merchantOwners[merchant].contentHash = contentHash;
        return true;
    }

    function owner( 
        address merchant
    ) 
        public 
        override
        view 
        returns (address) 
    {
        return _merchantOwners[merchant].owner;
    }

    function contentHash( 
        address merchant
    ) 
        public 
        override
        view 
        returns (bytes memory) 
    {
        return _merchantOwners[merchant].contentHash;
    }

    function hasPremission(
      bytes32 premission,
      address merchant
    )
      public
      override
      view 
      returns (bool)
    {
      return hasRole(premission, merchant);
    }

    function setRoleAdmin(bytes32 roleId, bytes32 adminRoleId) public {
        _setRoleAdmin(roleId, adminRoleId);
    }

    function revokeRole(
      bytes32 role, 
      address account
    ) 
      public 
      override 
    {
      require(
          role != DEFAULT_ADMIN_ROLE,
          "ZippieMerchantRegistry: cannot revoke default admin role"
      );

      super.revokeRole(role, account);
    }

    function renounceRole(
      bytes32, 
      address
    ) 
      public 
      override 
      {
        revert("ZippieMerchantRegistry: renounceRole has been disabled");
    }
}