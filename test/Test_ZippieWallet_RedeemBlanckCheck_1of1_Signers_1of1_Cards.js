var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieWallet = artifacts.require("./ZippieWallet.sol");
var ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const { 
	createBlankCheck,
	createBlankCheck_1of1Signer_1of1Card,
	createSetLimit_1of1Signer_1of1Card
} = require('./HelpFunctions');

contract("ZippieWallet", (accounts) => {

	var test;
	var basicToken;
	var zippieCardNonces;
	var zippieWallet;
	const haveCards = true

	// pay my gas server 
	const sponsorAccounts = [
		accounts[0]
	] 
	
	// multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
	const multisigAccounts = [
		accounts[5]
	]
	
	// signer (1of1)
	const signerAccounts = [
		accounts[0]
	]

	// card (2FA)
	//var card = accounts[3]

	// random verification key
	const verificationKeys = [
		accounts[4], 
		accounts[14]
	]

	// token recipient
	const recipientAccounts = [
		accounts[2]
	]

	beforeEach(() => {
		return TestFunctions.new().then(instance => {
			test = instance;
			return BasicERC20Mock.new(multisigAccounts[0]).then(instance => {
				basicToken = instance
				return ZippieCardNonces.new().then(instance => {
					zippieCardNonces = instance
					return ZippieWallet.new(zippieCardNonces.address).then(instance => {
						zippieWallet = instance;
						return basicToken.approve(zippieWallet.address, web3.utils.toWei("100", "ether"), {from: multisigAccounts[0]});
					});
				});
			});
		});
	});

	for(i = 0; i < 1; i++) {

		// Account Variants
		// [1,1,0,0]
		// [2,1,0,0]
		// [2,2,0,0]
		// [3,1,0,0]
		// [3,2,0,0]
		// [3,3,0,0]
		// [1,1,1,1] <= Current
		// [1,1,2,1]
		// [1,1,2,2]
		// [1,1,3,1]
		// [1,1,3,2]
		// [1,1,3,3]
		// [2,1,2,1]
		// [2,2,2,2]
		// [3,1,3,1]
		// [3,2,3,2]
		// [3,3,3,3]
		// [254, 254, 254, 254]
		
		let bc1 // Blank check 1
		let sl1 // Set limit 1

		beforeEach(async function () {
			//await this.token.approve(spender, 1, { from: owner });
			bc1 = await createBlankCheck(
				multisigAccounts[0],
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[0],
				[signerAccounts[0]],
				[signerAccounts[0]],
				[0],
				[0],
				[1, 1, 1, 1],
				web3.utils.toWei("1", "ether"),
				[0]
			)	

			bc1 = await createBlankCheck_1of1Signer_1of1Card(
				multisigAccounts[0],
				basicToken.address,
				recipientAccounts[0],
				verificationKeys[0],
				signerAccounts[0],
				0,
				[1, 1, 1, 1],
				web3.utils.toWei("1", "ether"),
				0
			)

			sl1 = await createSetLimit_1of1Signer_1of1Card(
				multisigAccounts[0],
				verificationKeys[1],
				signerAccounts[0],
				1,
				[1, 1, 1, 1],
				web3.utils.toWei("1", "ether"),
				1
			)
		});

		describe("Zippie multisig wallet tests", function() {	

			it("should allow a blank check to be cashed once, and fail the second time", async () => {
				let balanceOfSender = await basicToken.balanceOf(multisigAccounts[0])
				let balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
				assert(balanceOfSender.toString() === web3.utils.toWei("100", "ether"), "initial balance of sender is incorrect")
				assert(balanceOfRecipient.toString() === web3.utils.toWei("0", "ether"), "initial balance of recipient is incorrect") 
				assert(await zippieWallet.usedNonces(multisigAccounts[0], verificationKeys[0]) === false, "check already marked as cashed before transfer")
				
				// TODO: Check if return true
				await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})

				balanceOfSender = await basicToken.balanceOf(multisigAccounts[0])
				balanceOfRecipient = await basicToken.balanceOf(recipientAccounts[0])
				assert(balanceOfSender.toString() === web3.utils.toWei("99", "ether"), "amount did not transfer from sender")
				assert(balanceOfRecipient.toString() === web3.utils.toWei("1", "ether"), "amount did not transfer to recipient") 
				assert(await zippieWallet.usedNonces(multisigAccounts[0], verificationKeys[0]) === true, "check has not been marked as cashed after transfer")

				try {
					// try the same exact transfer
					await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
					assert(false, "duplicate transfer went through, but should have failed!")
				} catch(error) {
					assert(error.reason == 'Nonce already used', error.reason)
				}
			});

			it("should not allow a blank check to be cashed if amount is 0", async () => {
				//Amount must be greater than 0
			});
		
			it("should not allow a blank check to be cashed if account is invalid (incorrect signers)", async () => {
				//Invalid account
			});
		
			it("should not allow a blank check to be cashed if account is invalid (incorrect m)", async () => {
				//Invalid account
			});
		
			it("should not allow a blank check to be cashed if an invalid signer signatures is found", async () => {
				// Invalid address found when verifying signer signatures
			});
		
			it("should not allow a blank check to be cashed if an duplicated signer signatures is found", async () => {
				// Signer address has been used already
			});

			it("should not allow a blank check to be cashed if account balance too low", async () => {
				// Transfer failed (balance to low)
			});

			it("should not allow a blank check to be cashed if account has not approved token tranfers", async () => {
				// Transfer failed (approve to low)
			});
		});

		// [1,1,1,1] <= YES
		if (haveCards) {

			describe("Zippie multisig wallet tests (with cards)", function() {

				it("should allow a blank check to be cashed without card signatures, if amount is below current limit", async () => {
					let senderLimit = await zippieWallet.accountLimits(multisigAccounts[0])
					assert(senderLimit.toString() === web3.utils.toWei("0", "ether"), "initial limit is incorrect")
					
					await zippieWallet.setLimit(sl1.addresses, sl1.signers, sl1.m, sl1.signatures.v, sl1.signatures.r, sl1.signatures.s, sl1.amount, sl1.cardNonces, {from: sponsorAccounts[0]})
	
					senderLimit = await zippieWallet.accountLimits(multisigAccounts[0])
					assert(senderLimit.toString() === web3.utils.toWei("1", "ether"), "limit was not updated correctly")
	
					//bc.signatures.v = []
					await zippieWallet.redeemBlankCheck(bc1.addresses, bc1.signers, bc1.m, bc1.signatures.v, bc1.signatures.r, bc1.signatures.s, bc1.amount, bc1.cardNonces, {from: sponsorAccounts[0]})
	
					// try {
					// 	// try the same exact transfer
					// 	await zippieWallet.redeemBlankCheck(bc.addresses, bc.signers, bc.m, bc.signatures.v, bc.signatures.r, bc.signatures.s, bc.amount, bc.cardNonces, {from: sponsorAccount})
					// 	assert(false, "duplicate transfer went through, but should have failed!")
					// } catch(error) {
					// 	console.log(error.reason)
					// 	assert(error.reason == 'Nonce already used', error.reason)
					// }
				});	

				it("should not allow a blank check to be cashed without card signatures, if amount is above current limit", async () => {

				});

				it("should not allow a blank check to be cashed without card signatures, if amount is above current limit", async () => {

				});
			
				it("should allow a blank check to be cashed with card signatures, if amount is above current limit", async () => {
			
				});
			
				it("should allow to decrease the current limit without card signatures", async () => {
			
				});
			
				it("should not allow to increase the current limit without card signatures", async () => {
			
				});
			
				it("should allow to increase the current limit with card signatures", async () => {
			
				});

				it("should not allow a blank check to be cashed if an invalid card signatures is found", async () => {
					// Invalid address found when verifying card signatures
				});
			
				it("should not allow a blank check to be cashed if an duplicated card signatures is found", async () => {
					// Card address has been used already
				});

				it("should not allow a blank check to be cashed if card nonce already used", async () => {
					// Card nonce already used
				});

				it("should not allow a blank check to be cashed if invalid card nonce signature", async () => {
					// Invalid card nonce signature
				});
			})
		}
	}
});