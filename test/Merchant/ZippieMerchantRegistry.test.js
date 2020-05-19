const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers")
const { expect } = require('chai')
const ZippieMerchantRegistry = artifacts.require("ZippieMerchantRegistry")

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const PREMISSION_1 = web3.utils.sha3("PREMISSION_1")
const PREMISSION_2 = web3.utils.sha3("PREMISSION_2")
const PREMISSION_1_ADMIN = web3.utils.sha3("PREMISSION_1_ADMIN")
const CONTENT_HASH_1 = '0x0000000000000000000000000000000000000000000000000000000000000001'
const CONTENT_HASH_2 = '0x0000000000000000000000000000000000000000000000000000000000000002'


contract("ZippieMerchantRegistry", ([admin, merchantOwner1, merchant1, merchantOwner2, merchant2, other]) => {

  beforeEach(async function () {
    this.merchantRegistry = await ZippieMerchantRegistry.new({ from: admin })
  })

  describe('ZippieMerchantRegistry', function () {
   
    describe('Access Role functions', function () {
      it("default admin is set to admin for new roles", async function () {
        expect(await this.merchantRegistry.getRoleAdmin(DEFAULT_ADMIN_ROLE)).to.equal(DEFAULT_ADMIN_ROLE)
        expect(await this.merchantRegistry.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.bignumber.equal('1')

        expect(await this.merchantRegistry.getRoleAdmin(PREMISSION_1)).to.equal(DEFAULT_ADMIN_ROLE)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('0')

        expect(await this.merchantRegistry.getRoleAdmin(PREMISSION_2)).to.equal(DEFAULT_ADMIN_ROLE)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_2)).to.bignumber.equal('0')
      })

      it("allows admin to grant roles", async function () {
        // Check "admin" has admin role 
        expect(await this.merchantRegistry.getRoleAdmin(PREMISSION_1)).to.equal(DEFAULT_ADMIN_ROLE)
        expect(await this.merchantRegistry.getRoleAdmin(PREMISSION_2)).to.equal(DEFAULT_ADMIN_ROLE)
        expect(await this.merchantRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('0')
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_2)).to.bignumber.equal('0')

        // Let "admin" grant role "PREMISSION_1" to "merchant1"
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(false)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(false)
        const receipt = await this.merchantRegistry.grantRole(PREMISSION_1, merchant1, { from: admin })
        expectEvent(receipt, 'RoleGranted', { account: merchant1, role: PREMISSION_1, sender: admin })
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('1')

        // Let "admin" grant role "PREMISSION_1" to "merchant1" again (multiple grants)
        await this.merchantRegistry.grantRole(PREMISSION_1, merchant1, { from: admin })
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('1')

        // Let "admin" grant role "DEFAULT_ADMIN_ROLE" to "other"
        expect(await this.merchantRegistry.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.bignumber.equal('1')
        const receipt2 = await this.merchantRegistry.grantRole(DEFAULT_ADMIN_ROLE, other, { from: admin })
        expectEvent(receipt2, 'RoleGranted', { account: other, role: DEFAULT_ADMIN_ROLE, sender: admin })
        expect(await this.merchantRegistry.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.bignumber.equal('2')

        // Let "other" grant role "PREMISSION_2" to "merchant1"
        expect(await this.merchantRegistry.hasRole(PREMISSION_2, merchant1)).to.equal(false)
        const receipt3 = await this.merchantRegistry.grantRole(PREMISSION_2, merchant1, { from: other })
        expectEvent(receipt3, 'RoleGranted', { account: merchant1, role: PREMISSION_2, sender: other })
        expect(await this.merchantRegistry.hasRole(PREMISSION_2, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_2)).to.bignumber.equal('1')

        // Let "admin" grant role "PREMISSION_1" to "merchant2"
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('1')
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant2)).to.equal(false)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant2)).to.equal(false)
        const receipt4 = await this.merchantRegistry.grantRole(PREMISSION_1, merchant2, { from: admin })
        expectEvent(receipt4, 'RoleGranted', { account: merchant2, role: PREMISSION_1, sender: admin })
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant2)).to.equal(true)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant2)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('2')
      })
  
      it("prevents non-admin to grant roles", async function () {
        // Check so "other" don't have the admin role 
        expect(await this.merchantRegistry.getRoleAdmin(PREMISSION_1)).to.equal(DEFAULT_ADMIN_ROLE)
        expect(await this.merchantRegistry.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)

        // Let "other" try to grant role "PREMISSION_1" to "merchant1"
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(false)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(false)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('0')
        await expectRevert(
          this.merchantRegistry.grantRole(PREMISSION_1, merchant1, { from: other }),
          'AccessControl: sender must be an admin to grant'
        )
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(false)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(false)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('0')
      })

      it("allows admin to revoke roles", async function () {
        // Check "admin" has admin role 
        expect(await this.merchantRegistry.getRoleAdmin(PREMISSION_1)).to.equal(DEFAULT_ADMIN_ROLE)
        expect(await this.merchantRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)

        // Grant role "PREMISSION_1" to "merchant1"
        await this.merchantRegistry.grantRole(PREMISSION_1, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(true)

        // Revoke role "PREMISSION_1" from "merchant1"
        const receipt = await this.merchantRegistry.revokeRole(PREMISSION_1, merchant1, { from: admin })
        expectEvent(receipt, 'RoleRevoked', { account: merchant1, role: PREMISSION_1, sender: admin })
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(false)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(false)

        // Revoke role "PREMISSION_1" from "merchant1" again (multiple grants)
        await this.merchantRegistry.revokeRole(PREMISSION_1, merchant1, { from: admin })

        // Try to revoke "DEFAULT_ADMIN_ROLE" role from "admin"
        expect(await this.merchantRegistry.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.bignumber.equal('1')
        await expectRevert(
          this.merchantRegistry.revokeRole(DEFAULT_ADMIN_ROLE, admin, { from: admin }),
          'ZippieMerchantRegistry: cannot revoke default admin role'
        )
        expect(await this.merchantRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.bignumber.equal('1')
      })

      it("prevents non-admin to revoke roles", async function () {
        // Grant role "PREMISSION_1" to "merchant1"
        await this.merchantRegistry.grantRole(PREMISSION_1, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('1')

        // Check so "other" don't have the admin role 
        expect(await this.merchantRegistry.getRoleAdmin(PREMISSION_1)).to.equal(DEFAULT_ADMIN_ROLE)
        expect(await this.merchantRegistry.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)
        
        // Let "other" try to revoke role "PREMISSION_1" from "merchant1"
        await expectRevert(
          this.merchantRegistry.revokeRole(PREMISSION_1, merchant1, { from: other }),
          'AccessControl: sender must be an admin to revoke'
        )
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('1')
      })

      it("has disabled renounce of roles", async function () {
        // Grant role "PREMISSION_1" to "merchant1"
        await this.merchantRegistry.grantRole(PREMISSION_1, merchant1, { from: admin })
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('1')

        // Try to renounce "PREMISSION_1" to "merchant1" (from "merchant1")
        await expectRevert(
          this.merchantRegistry.renounceRole(PREMISSION_1, merchant1, { from: merchant1 }),
          'ZippieMerchantRegistry: renounceRole has been disabled'
        )
        // Try to renounce "PREMISSION_1" to "merchant1" (from "admin")
        await expectRevert(
          this.merchantRegistry.renounceRole(PREMISSION_1, merchant1, { from: admin }),
          'ZippieMerchantRegistry: renounceRole has been disabled'
        )
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('1')
      })

      it('allows to enumerate all accounts with a specific role', async function () {
         // Grant role "PREMISSION_1" to "merchant1" and "merchant2"
        await this.merchantRegistry.grantRole(PREMISSION_1, merchant1, { from: admin })
        await this.merchantRegistry.grantRole(PREMISSION_1, merchant2, { from: admin })
  
        // Get member count of role "PREMISSION_1" and iterate to get member by index
        const memberCount = await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)
        expect(memberCount).to.bignumber.equal('2')
        const bearers = []
        for (let i = 0; i < memberCount; ++i) {
          bearers.push(await this.merchantRegistry.getRoleMember(PREMISSION_1, i))
        }
        expect(bearers).to.have.members([merchant1, merchant2])
      })

      it("allows admin roles to be changed", async function () {
        // Check "admin" has admin role 
        expect(await this.merchantRegistry.getRoleAdmin(PREMISSION_1)).to.equal(DEFAULT_ADMIN_ROLE)
        expect(await this.merchantRegistry.getRoleAdmin(PREMISSION_2)).to.equal(DEFAULT_ADMIN_ROLE)
        expect(await this.merchantRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('0')
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_2)).to.bignumber.equal('0')

        // Let "admin" grant role "PREMISSION_1" to "merchant1"
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(false)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(false)
        const receipt1 = await this.merchantRegistry.grantRole(PREMISSION_1, merchant1, { from: admin })
        expectEvent(receipt1, 'RoleGranted', { account: merchant1, role: PREMISSION_1, sender: admin })
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant1)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('1')

        // Change admin role for "PREMISSION_1" to "PREMISSION_1_ADMIN"
        const receipt2 = await this.merchantRegistry.setRoleAdmin(PREMISSION_1, PREMISSION_1_ADMIN)
        // XXX: merged to master but not released by OpenZeppelin yet
        //expectEvent(receipt2, 'RoleAdminChanged', { role: PREMISSION_1, previousAdminRole: DEFAULT_ADMIN_ROLE, newAdminRole: PREMISSION_1_ADMIN})
        expect(await this.merchantRegistry.getRoleAdmin(PREMISSION_1)).to.equal(PREMISSION_1_ADMIN)
        expect(await this.merchantRegistry.hasRole(PREMISSION_1_ADMIN, admin)).to.equal(false)

        // Let "admin" try to grant role "PREMISSION_1" to "merchant2"
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant2)).to.equal(false)
        expect(await this.merchantRegistry.hasPremission(PREMISSION_1, merchant2)).to.equal(false)
        await expectRevert(
          this.merchantRegistry.grantRole(PREMISSION_1, merchant2, { from: admin }),
          'AccessControl: sender must be an admin to grant'
        )        

        // Let "admin" grant role "PREMISSION_1_ADMIN" to "other"
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1_ADMIN)).to.bignumber.equal('0')
        const receipt3 = await this.merchantRegistry.grantRole(PREMISSION_1_ADMIN, other, { from: admin })
        expectEvent(receipt3, 'RoleGranted', { account: other, role: PREMISSION_1_ADMIN, sender: admin })
        expect(await this.merchantRegistry.hasRole(PREMISSION_1_ADMIN, other)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1_ADMIN)).to.bignumber.equal('1')

        // Let "other" grant role "PREMISSION_1" to "merchant2"
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant2)).to.equal(false)
        const receipt4 = await this.merchantRegistry.grantRole(PREMISSION_1, merchant2, { from: other })
        expectEvent(receipt4, 'RoleGranted', { account: merchant2, role: PREMISSION_1, sender: other })
        expect(await this.merchantRegistry.hasRole(PREMISSION_1, merchant2)).to.equal(true)
        expect(await this.merchantRegistry.getRoleMemberCount(PREMISSION_1)).to.bignumber.equal('2')        
      })
    })

    describe('Merchant Owner functions', function () {
      it("allows admin to set merchant owner (and content hash)", async function () {
        // Check "admin" has admin role 
        expect(await this.merchantRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true)
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(ZERO_ADDRESS)

        // Set merchant owner for "merchant1" to "merchantOwner1"
        expect(await this.merchantRegistry.contentHash(merchant1)).to.equal(null)
        const receipt1 = await this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH_1, { from: admin })
        expectEvent(receipt1, 'MerchantChanged', { merchant: merchant1, owner: merchantOwner1, contentHash: CONTENT_HASH_1 })
        expect(await this.merchantRegistry.owner(merchant1)).to.equal(merchantOwner1)
        expect(await this.merchantRegistry.contentHash(merchant1)).to.equal(CONTENT_HASH_1)

        // Set merchant owner for "merchant2" to "merchantOwner1" (two merchants with same owner)
        expect(await this.merchantRegistry.contentHash(merchant2)).to.equal(null)
        const receipt2 = await this.merchantRegistry.setMerchant(merchant2, merchantOwner1, CONTENT_HASH_1, { from: admin })
        expectEvent(receipt2, 'MerchantChanged', { merchant: merchant2, owner: merchantOwner1, contentHash: CONTENT_HASH_1 })
        expect(await this.merchantRegistry.owner(merchant2)).to.equal(merchantOwner1)
        expect(await this.merchantRegistry.contentHash(merchant2)).to.equal(CONTENT_HASH_1)

        // Change merchant owner for "merchant2" to "merchantOwner2" 
        const receipt3 = await this.merchantRegistry.setMerchant(merchant2, merchantOwner2, CONTENT_HASH_2, { from: admin })
        expectEvent(receipt3, 'MerchantChanged', { merchant: merchant2, owner: merchantOwner2, contentHash: CONTENT_HASH_2 })
        expect(await this.merchantRegistry.owner(merchant2)).to.equal(merchantOwner2)
        expect(await this.merchantRegistry.contentHash(merchant2)).to.equal(CONTENT_HASH_2)
      })
  
      it("prevents non-admins to set merchant owner (and content hash)", async function () {
        // Check so "other" don't have the admin role 
        expect(await this.merchantRegistry.hasRole(DEFAULT_ADMIN_ROLE, other)).to.equal(false)

        // Let "other" try to set merchant owner
        await expectRevert(
          this.merchantRegistry.setMerchant(merchant1, merchantOwner1, CONTENT_HASH_1, { from: other }),
          'ZippieMerchantRegistry: Caller is not admin'
        )
      })
    })
  })
})
