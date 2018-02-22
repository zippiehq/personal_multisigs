pragma solidity ^0.4.18;

import './SafeMath.sol';

// basic ERC20 interface contract 
contract ERC20 {
	function totalSupply() constant public returns (uint supply);
	function balanceOf(address _owner) constant public returns (uint balance);
	function transfer(address _to, uint _value) public returns (bool success);
	function transferFrom(address _from, address _to, uint _value) public returns (bool success);
	function approve(address _spender, uint _value) public returns (bool success);
	function allowance(address _owner, address _spender) constant public returns (uint remaining);
	event Transfer(address indexed _from, address indexed _to, uint _value);
	event Approval(address indexed _owner, address indexed _spender, uint _value);
}

contract BasicERC20 is ERC20 {

	using SafeMath for *;

	// constants for ERC20 standard
	string public constant name = "Basic ERC20";
	string public constant symbol = "ERC20";
	uint8 public constant decimals = 18;
	// variable total supply
	uint256 public totalSupply;

	// mapping to store tokens
	mapping(address => uint256) balances;
	mapping(address => mapping(address => uint256)) allowed;

	// constructor
	function BasicERC20(address luckyAddress) public {
		// assign a bunch of tokens to an address

		balances[luckyAddress] = 100 ether;

		totalSupply = 100 ether;

	}

	// basic ERC20 functionality
	function totalSupply() constant public returns(uint){
		return totalSupply;
	}

	function balanceOf(address _owner) constant public returns(uint){
		return balances[_owner];
	}

	function transfer(address _to, uint256 _value) public returns (bool success){
		if (balances[msg.sender] >= _value 
			&& _value > 0){

			// safely subtract
			balances[msg.sender] = SafeMath.sub(balances[msg.sender], _value);
			balances[_to] = SafeMath.add(balances[_to], _value);

			// log event 
			Transfer(msg.sender, _to, _value);
		}
		else {
			return false;
		}
	}

	function transferFrom(address _from, address _to, uint _value) public returns(bool){
		if (allowed[_from][msg.sender] >= _value 
			&& balances[_from] >= _value 
			&& _value > 0){

			// safely add to _to and subtract from _from, and subtract from allowed balances.
			balances[_to] = SafeMath.add(balances[_to], _value);
	   		balances[_from] = SafeMath.sub(balances[_from], _value);
	  		allowed[_from][msg.sender] = SafeMath.sub(allowed[_from][msg.sender], _value);

	  		// log event
    		Transfer(_from, _to, _value);
    		return true;
   		} 
    	else { 
    		return false;
    	}
	}
	
	function approve(address _spender, uint _value) public returns(bool){
		require(_value > 0);
		allowed[msg.sender][_spender] = _value;
		Approval(msg.sender, _spender, _value);
		// log event
		return true;
	}
	
	function allowance(address _owner, address _spender) constant public returns(uint){
		return allowed[_owner][_spender];
	}
}