pragma solidity ^0.5.6;

import "./IZippieCardNonces.sol";
import "./ZippieUtils.sol";

/**
  * @title Zippie Card
  * @dev Multi signature and nonce verification for smart cards (2FA) 
  * nonces are globally stored in it's own contract so they cannot 
  * be resused between different contracts using the same card
 */
contract ZippieCard {

    // address to shared card nonce data contract 
    // (for replay protection)
    address private _zippieCardNonces;

    /**
      * @dev Connect this contract to use the shared nonce data contract
      * @param zippieCardNonces address to shared card nonce data contract
      */
    constructor(address zippieCardNonces) public {
        _zippieCardNonces = zippieCardNonces;
    }

    /** 
      * @dev Verify that all provided card signatures are valid 
      * and nonces has not been used yet
      * @param cardNonces random values generated and signed by cards at every read
      * @param cardOffset offset values to cardAddresses array 
      * [0] offset index to first card address
      * [1] number of card addresses    
      * @param cardAddresses card addresses (starting from offset index)
      * @param signatureOffset offset values to signature arrays (v, r, s)
      * [0] offset index to first card signature
      * [1] number of card signatures   
      * @param v v values of card signatures (starting from offset index)
      * @param r r values of card signatures (starting from offset index)
      * @param s s values of card signatures (starting from offset index)
      */
    function verifyCardSignatures(
        bytes32[] memory cardNonces, 
        uint8[2] memory cardOffset, 
        address[] memory cardAddresses, 
        uint8[2] memory signatureOffset, 
        uint8[] memory v, 
        bytes32[] memory r, 
        bytes32[] memory s
    ) 
        internal 
        returns (bool)
    {
        require(
            cardNonces.length == cardOffset[1], 
            "Incorrect number of card nonces"
        ); 
        require(
            signatureOffset[1] <= cardOffset[1], 
            "Required number of card signatures cannot be higher than number of possible cards"
        );
        require(
            cardOffset[0] != 0xFF, 
            "Card offset cannot be MAX UINT8"
        );
        require(
            cardOffset[1] != 0xFF, 
            "Nr of cards cannot be MAX UINT8"
        );
        require(
            signatureOffset[0] != 0xFF, 
            "Signature offset cannot be MAX UINT8"
        );
        require(
            signatureOffset[1] != 0xFF, 
            "Nr of signatures cannot be MAX UINT8"
        );
        require(
            cardAddresses.length >= cardOffset[0] + cardOffset[1], 
            "Incorrect number of cardAddresses"
        ); 
        require(
            v.length >= signatureOffset[0] + signatureOffset[1], 
            "Incorrect number of signatures (v)"
        ); 
        require(
            r.length >= signatureOffset[0] + signatureOffset[1], 
            "Incorrect number of signatures (r)"
        ); 
        require(
            s.length >= signatureOffset[0] + signatureOffset[1], 
            "Incorrect number of signatures (s)"
        ); 

        // remember used card addresses to check for duplicates
        address[] memory usedCardAddresses = new address[](signatureOffset[1]);
       
        // recovered card address 
        address cardAddress;

        // check all card signatures
        for (uint8 i = 0; i < signatureOffset[1]; i++) {

            // recover card address
            cardAddress = ecrecover(
                cardNonces[i], 
                v[signatureOffset[0]+i], 
                r[signatureOffset[0]+i], 
                s[signatureOffset[0]+i]
            );

            // check that address is a valid card address
            require(
                ZippieUtils.isAddressInArray(
                    cardAddress, 
                    cardOffset[0], 
                    cardOffset[1], 
                    cardAddresses
                ), 
                "Invalid address found when verifying card signatures"
            );

            // check that this address is not a duplicate
            require(
                !ZippieUtils.isAddressInArray(
                    cardAddress, 
                    0, 
                    i, 
                    usedCardAddresses
                ), 
                "Card address has been used already"
            );

            // add this card address to the used list
            usedCardAddresses[i] = cardAddress;

            // flag card nonce as used in the card nonce contract, 
            // revert if used already
            require(
                IZippieCardNonces(_zippieCardNonces).useNonce(
                    cardAddress, 
                    cardNonces[i],
                    v[signatureOffset[0]+i], 
                    r[signatureOffset[0]+i], 
                    s[signatureOffset[0]+i]
                ),
                "Use card nonce failed"
            );
        }
        return true;
    }
}