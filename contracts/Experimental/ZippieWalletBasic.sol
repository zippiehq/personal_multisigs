pragma solidity ^0.5.7;

import "../Zippie/Multisig/ZippieMultisig.sol";
import "../Zippie/Utils/ZippieUtils.sol";
import "../Zippie/Wallet/ERC20/ZippieAccount.sol";

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

/**
  * @title Zippie Multisig Wallet
  * @notice Transfer ERC20 tokens using multiple signatures
 */
contract ZippieWalletBasic is ZippieAccount, ZippieMultisig {
    
    /** @notice Redeems a blank check after verifying required signers
      * (recipient is specified when check is claimed) 
      * @dev Transfer ERC20 tokens when verified that 
      * enough signers has signed keccak256(amount, verification key)
      * @param addresses required addresses
      * [0] ERC20 token to transfer
      * [1] recipient of the ERC20 tokens
      * [2] verification key (nonce)
      * @param signers all possible signers
      * [0..i] signer addresses
      * @param m the amount of signatures required for this multisig account
      * [0] possible number of signers
      * [1] required number of signers
      * @param v v values of all signatures
      * [0] verification key signature
      * [1..i] signer signatures of check hash
      * @param r r values of all signatures (structured as v)
      * @param s s values of all signatures (structured as v)
      * @param amount amount to transfer
      * @return true if transfer successful 
      */
    function redeemBlankCheck(
        address[] memory addresses, 
        address[] memory signers, 
        uint8[] memory m, 
        uint8[] memory v, 
        bytes32[] memory r, 
        bytes32[] memory s, 
        uint256 amount    
    ) 
        public 
        returns (bool)
    {
        require(
            addresses.length == 3, 
            "Incorrect number of addresses"
        ); 
        require(
            amount > 0, 
            "Amount must be greater than 0"
        );

        // get account address
        address accountAddress = getAccountAddress(
            keccak256(abi.encodePacked(signers, m))
        );
       
        // sanity check of signature parameters 
        checkSignatureParameters(
            m, 
            signers.length, 
            v.length, 
            r.length, 
            s.length
        );

        // verify nonce for replay protection 
        // (verification key signing recipient address)
        verifyMultisigNonce(
            accountAddress, 
            addresses[2], 
            ZippieUtils.toEthSignedMessageHash(
                keccak256(abi.encodePacked(addresses[1]))
            ), 
            v[0], 
            r[0], 
            s[0]
        );

        // get the check hash (token, amount, nonce) 
        // and verify that required number of signers signed it 
        // (recipient specified when check was claimed)
        verifyMultisigSignerSignatures(
            ZippieUtils.toEthSignedMessageHash(
                keccak256(abi.encodePacked("redeemBlankCheck", addresses[0], amount, addresses[2]))
            ), 
            [0, m[0]], 
            signers, 
            [1, m[1]], 
            v, 
            r, 
            s
        );

        // check if account needs to be "created" (ERC20 approve)
        if(IERC20(addresses[0]).allowance(accountAddress, address(this)) == 0) {
            require(
                approveToken(addresses[0], keccak256(abi.encodePacked(signers, m))) == accountAddress, 
                "Token approval failed"
            );
        }

        // transfer tokens from multisig account to recipient address
        require(
            IERC20(addresses[0]).transferFrom(accountAddress, addresses[1], amount), 
            "Transfer failed"
        );
        return true;
    }

    /** 
      * @dev sanity check of signature related parameters
      */
    function checkSignatureParameters(
        uint8[] memory m, 
        uint256 nrOfSigners, 
        uint256 nrOfVs, 
        uint256 nrOfRs, 
        uint256 nrOfSs
    ) 
        private 
        pure 
        returns (bool)
    {
        require(
            m.length == 2, 
            "Invalid m[]"
        );
        require(
            m[1] <= m[0], 
            "Required number of signers cannot be higher than number of possible signers"
        );
        require(
            m[0] > 0, 
            "Required number of signers cannot be 0"
        );           
        require(
            m[1] > 0, 
            "Possible number of signers cannot be 0"
        );  
        require(
            m[0] != 0xFF, 
            "Cannot be MAX UINT8"
        ); 
        require(
            m[1] != 0xFF, 
            "Cannot be MAX UINT8"
        ); 
        require(
            nrOfSigners == m[0], 
            "Incorrect number of signers"
        ); 
        require(
            nrOfVs == 1 + m[1], 
            "Incorrect number of signatures (v)"
        ); 
        require(
            nrOfRs == 1 + m[1], 
            "Incorrect number of signatures (r)"
        ); 
        require(
            nrOfSs == 1 + m[1], 
            "Incorrect number of signatures (s)"
        );
        return true; 
    }
}