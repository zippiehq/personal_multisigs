var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWallet.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const { 
	createBlankCheck_1of1Signer_1of1Card
} = require('./HelpFunctions');

contract("ZippieWallet", (accounts) => {

	var test;
	var basicToken;
	var zippieCardNonces;
	var zippieWallet;

	// multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
	const multisig = accounts[5]
	// signer (1of1)
	const signer = accounts[0] 
	// card (2FA)
	var card = accounts[3]
	// random verification key
	const verificationKey = accounts[4] 
	// token recipient
	const recipient = accounts[2]
	// pay my gas server 
	const sponsor = accounts[6] 

	beforeEach(() => {
		return TestFunctions.new().then(instance => {
			test = instance;
			return BasicERC20Mock.new(accounts[5]).then(instance => {
				basicToken = instance
				return ZippieCardNonces.new().then(instance => {
					zippieCardNonces = instance
					return ZippieWallet.new(zippieCardNonces.address).then(instance => {
						zippieWallet = instance;
						return basicToken.approve(zippieWallet.address, web3.utils.toWei("100", "ether"), {from: accounts[5]});
					});
				});
			});
		});
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig with 2FA, and fail the second time", async () => {
		const check = await createBlankCheck_1of1Signer_1of1Card(
			multisig,
			basicToken.address,
			recipient,
			verificationKey,
			signer,
			0,
			[1, 1, 1, 1],
			web3.utils.toWei("1", "ether"),
			0
		)

		//assert(await basicToken.balanceOf(multisig) === web3.utils.toBN(web3.utils.toWei("100", "ether")), "initial balance of sender is incorrect")
		//assert(await basicToken.balanceOf(recipient) === web3.utils.toBN(web3.utils.toWei("0", "ether")), "initial balance of recipient is icorrect") 
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer")
		
		// TODO: Check if return true
		await zippieWallet.redeemBlankCheck(
			check.addresses, 
			check.signers, 
			check.m, 
			check.signatures.v, 
			check.signatures.r, 
			check.signatures.s, 
			check.amount, 
			check.cardNonces, 
			{from: sponsor}
		)

		//assert(await basicToken.balanceOf(multisig) === web3.utils.toBN(web3.utils.toWei("99", "ether")), "amount did not transfer from sender")
		//assert(await basicToken.balanceOf(recipient) === web3.utils.toBN(web3.utils.toWei("1", "ether")), "amount did not transfer to recipient") 
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer")

		try {
			// try the same exact transfer
			await zippieWallet.redeemBlankCheck(
				check.addresses, 
				check.signers, 
				check.m, 
				check.signatures.v, 
				check.signatures.r, 
				check.signatures.s, 
				check.amount, 
				check.cardNonces, 
				{from: sponsor}
			);
			assert(false, "duplicate transfer went through, but should have failed!")
		} catch(error) {
			assert(error.reason == 'Nonce already used', error.reason)
		}
	});
});