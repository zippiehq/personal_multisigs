pragma solidity ^0.6.0;

import "./IZippieMerchantRegistry.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
  * @title Zippie Merchant Registry
  * @notice Manage Zippie Merchants owners and permissions
  * @dev Using OpenZeppelin AccessControl for permsissions
 */
contract ZippieMerchantRegistry is IZippieMerchantRegistry, AccessControl {

    struct Merchant {
        address owner;
        bytes contentHash;
    }

    mapping (address => Merchant) private _merchantOwners;
    event MerchantChanged(address indexed merchant, address indexed owner, bytes contentHash);

    /**
     * @dev Constructs a new Zippie Merchant registry
     */
    constructor() public {
      _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /** 
      * @dev Set Merchant data
      * @param merchant merchant account
      * @param owner owner of this merchant account
      * @param contentHash content hash where to find additional info about the merchant
      * @return true if successful 
      */
    function setMerchant(
        address merchant, 
        address owner,
        bytes memory contentHash
    ) 
        public 
        override 
        returns (bool) 
    {
        if (_merchantOwners[merchant].owner != address(0)) {
          // Only Admin is allowed to change owner after set first time
          require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender), 
            "ZippieMerchantRegistry: Caller is not admin"
          );
        }
        
        emit MerchantChanged(merchant, owner, contentHash);
        _merchantOwners[merchant].owner = owner;
        _merchantOwners[merchant].contentHash = contentHash;
        return true;
    }

    /** 
      * @dev Get merchant owner
      * @param merchant merchant account
      * @return address of owner
      */
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

    /**
      * @dev Get merchant content hash
      * @param merchant merchant account
      * @return content hash
      */
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

    /** 
      * @dev Check if a merchant has a specified permission
      * @param permission permission to check (keccack256("PERMISSION"))
      * @param merchant merchant account
      * @return true if merchant has permisison
      */
    function hasPermission(
      bytes32 permission,
      address merchant
    )
      public
      override
      view 
      returns (bool)
    {
      return hasRole(permission, merchant);
    }

    /** 
      * @dev allow admin role to be changed (AccessControl)
      */
    function setRoleAdmin(bytes32 roleId, bytes32 adminRoleId) public {
        _setRoleAdmin(roleId, adminRoleId);
    }

    /**
      * @dev prevent so default admin role cannot be revoked (AccessControl)
      */
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

    /**
      * @dev prevent roles to be renounced (AccessControl)
      */
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