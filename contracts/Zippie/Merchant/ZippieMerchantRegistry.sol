pragma solidity ^0.6.0;

import "./IZippieMerchantRegistry.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ZippieMerchantRegistry is IZippieMerchantRegistry, AccessControl {

    // XXX: use struct Record ?
    mapping (address => address) private _merchantOwners;
    // XXX: add msg to event ?
    event MerchantOwnershipChanged(address indexed merchant, address indexed previousOwner, address indexed newOwner);

    constructor() public {
      _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setMerchantOwner(
        address merchant, 
        address newOwner
    ) 
        public 
        override 
        returns (bool) 
    {
        require(
          hasRole(DEFAULT_ADMIN_ROLE, msg.sender), 
          "ZippieMerchantRegistry: Caller is not admin"
        );
        
        emit MerchantOwnershipChanged(merchant, _merchantOwners[merchant], newOwner);
        _merchantOwners[merchant] = newOwner;
        return true;
    }

    function merchantOwner( 
        address merchant
    ) 
        public 
        override
        view 
        returns (address) 
    {
        return _merchantOwners[merchant];
    }

    // XXX: remove ?
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

    // function revokeRole(
    //   bytes32 role, 
    //   address account
    // ) 
    //   public 
    //   override 
    // {
    //   require(
    //       role != DEFAULT_ADMIN_ROLE,
    //       "ZippieMerchantRegistry: cannot revoke default admin role"
    //   );

    //   super.revokeRole(role, account);
    // }

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