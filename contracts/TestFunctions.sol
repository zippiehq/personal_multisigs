pragma solidity 0.4.24;

contract TestFunctions {

    // these functions are simply for testing
    // since truffle/web3 hashes things in a different way, we can call these pure functions
    // and hash things inside the evm so we can be sure that things will hash the same
    function soliditySha3_addresses_m(address[] validAddresses, uint8[] m) public pure returns(bytes32){
        return keccak256(abi.encodePacked(validAddresses, m));
    }

    function soliditySha3_amount_recipient_nonce(uint256 amount, address recipient, uint256 nonce) public pure returns(bytes32){
        return keccak256(abi.encodePacked(amount, recipient, nonce));
    }

    function soliditySha3_amount_address(uint256 amount, address key) public pure returns(bytes32){
        return keccak256(abi.encodePacked(amount, key));
    }

    function soliditySha3_address(address addr) public pure returns(bytes32){
        return keccak256(abi.encodePacked(addr));
    }

    function soliditySha3_sign(bytes32 hash) public pure returns(bytes32){
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}