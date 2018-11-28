pragma solidity >=0.5.0 <0.6.0;

import "./ZippieMultisig.sol";
import "./ZippieNonce.sol";
import "./ZippieUtils.sol";

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

/**
    @title Zippie Multisig Wallet
    @author Zippie
    @notice Handles interactions with Zippie multisig wallets
    @dev NOTE: YOUR SIGNING APPLICATION MAY NOT PREPEND "\x19Ethereum Signed Message:\n32" TO THE OBJECT TO BE SIGNED. 
    FEEL FREE TO REMOVE IF NECESSARY
 */
contract ZippieWalletNoCards is ZippieMultisig, ZippieNonce {

    /** @notice Redeems a check after verifying all required signers (recipient specified when check was created) 
        @dev Upon successful verification of the signatures, it's necessary to verify that the signers signed keccak256(recipient, amount, nonce)
        @param addresses multisig address, erc20 contract address, recipient
        [0] multisig account to withdraw ERC20 tokens from
        [1] ERC20 contract to use
        [2] recipient of the ERC20 tokens
        [3] nonce
      * @param signers possible signers 
      * @param m the amount of signatures required to transfer from the multisig account
        [0] possible number of signers
        [1] required number of signers
      * @param v v values of all signatures
        [0] multisig account signature
        [1] verification key signature
        [2..i] signer signatures of check
      * @param r r values of all signatures (structured as v)
      * @param s s values of all signatures (structured as v)
      * @param amount amount to transfer
      */
    function redeemCheck(address[] memory addresses, address[] memory signers, uint8[] memory m, uint8[] memory v, bytes32[] memory r, bytes32[] memory s, uint256 amount) public {
        require(addresses.length == 4, "Incorrect number of addresses");  
        require(amount > 0, "Amount must be greater than 0");

        // sanity check of signature parameters 
        checkSignatureParameters(signers.length, m, v.length, r.length, s.length);

        // verify that account signature is valid
        verifyMultisigAccountSignature(signers, m, addresses[0], v[0], r[0], s[0]);

        // verify nonce for replay protection
        verifyMultisigNonce(addresses[0], addresses[3], addresses[2], v[1], r[1], s[1]);

        // get the check hash (amount, recipient, nonce) and verify that required number of signers signed it (recipient specified when check was created) 
        bytes32 checkHash = ZippieUtils.toEthSignedMessageHash(keccak256(abi.encodePacked(amount, addresses[2], addresses[3])));
        verifySignerSignatures(checkHash, [0, m[0]], signers, [2, m[1]], v, r, s);

        // transfer tokens
        require(IERC20(addresses[1]).transferFrom(addresses[0], addresses[2], amount), "Transfer failed");
    }

    /** @notice Redeems a blank check after verifying all required signers (recipient specified when check was claimed) 
        @dev Upon successful verification of the signatures, it's necessary to verify that the signers signed keccak256(amount, verification key)
      * @param addresses multisig address, erc20 contract address, recipient, verification key
        [0] multisig account to withdraw ERC20 tokens from
        [1] ERC20 contract to use
        [2] recipient of the ERC20 tokens
        [3] nonce
      * @param signers signers followed by card signers
      * @param m the amount of signatures required to transfer from the multisig account
        [0] possible number of signers
        [1] required number of signers
      * @param v v values of all signatures
        [0] multisig account signature
        [1] verification key signature
        [2..i] signer signatures of check
      * @param r r values of all signatures (structured as v)
      * @param s s values of all signatures (structured as v)
      * @param amount amount to transfer
      */
    function redeemBlankCheck(address[] memory addresses, address[] memory signers, uint8[] memory m, uint8[] memory v, bytes32[] memory r, bytes32[] memory s, uint256 amount) public {
        require(addresses.length == 4, "Incorrect number of addresses"); 
        require(amount > 0, "Amount must be greater than 0");

        // sanity check of signature parameters 
        checkSignatureParameters(signers.length, m, v.length, r.length, s.length);

        // verify that account signature is valid
        verifyMultisigAccountSignature(signers, m, addresses[0], v[0], r[0], s[0]);

        // verify nonce for replay protection
        verifyMultisigNonce(addresses[0], addresses[3], addresses[2], v[1], r[1], s[1]);

        // get the check hash (amount, nonce) and verify that required number of signers signed it (recipient specified when check was claimed) 
        bytes32 blankCheckHash = ZippieUtils.toEthSignedMessageHash(keccak256(abi.encodePacked(amount, addresses[3])));
        verifySignerSignatures(blankCheckHash, [0, m[0]], signers, [2, m[1]], v, r, s);

        // transfer tokens
        require(IERC20(addresses[1]).transferFrom(addresses[0], addresses[2], amount), "Transfer failed");
    }

    function checkSignatureParameters(uint256 nrOfSigners, uint8[] memory m, uint256 nrOfVs, uint256 nrOfRs, uint256 nrOfSs) private pure {
        require(m.length == 2, "Invalid m[]");
        require(m[1] <= m[0], "Required number of signers cannot be higher than number of possible signers");
        require(m[0] > 0, "Required number of signers cannot be 0");           
        require(m[1] > 0, "Possible number of signers cannot be 0");  
        require(m[0] != 0xFF, "Cannot be MAX UINT8"); 
        require(m[1] != 0xFF, "Cannot be MAX UINT8"); 
        require(nrOfSigners == m[0], "Incorrect number of signers"); 
        require(nrOfVs == 2 + m[1], "Incorrect number of signatures (v)"); 
        require(nrOfRs == 2 + m[1], "Incorrect number of signatures (r)"); 
        require(nrOfSs == 2 + m[1], "Incorrect number of signatures (s)"); 
    }
}