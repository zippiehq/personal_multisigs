var TestFunctions = artifacts.require("./TestFunctions.sol");
var BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
var ZippieMultisigWallet = artifacts.require("./ZippieMultisigWallet.sol");
var test;
import { getMultisigSignature, getBlankCheckSignature, getRecipientSignature, getDigestSignature, getSignature, log } from './HelpFunctions';

contract("Test Zippie Multisig Balance or Allowance Too Low", (accounts) => {

	var basicToken;
	var zipperMS;

	const signer = accounts[0] // multisig signer (1of1)
	const recipient = accounts[2]
	const card = accounts[3]
	const verificationKey = accounts[4] // random verification key
	const multisig = accounts[5] // multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
	const sponsor = accounts[6] // Zippie PMG server

	beforeEach(() => {
			return TestFunctions.new().then(instance => {
					test = instance;
    			return BasicERC20Mock.new(accounts[5]).then(instance => {
						basicToken = instance;
						return ZippieMultisigWallet.new();
     			}).then(instance => {
     				zipperMS = instance;
						return basicToken.approve(instance.address, web3.utils.toWei("0", "ether"), {from: accounts[5]});
				});
			});
	});

	it("should not allow a blank check to be cashed from a 1 of 1 multisig (with 2FA) if multisig lacks allowance to cover amount", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const blankCheckAmount = "1"

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, blankCheckAmount)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const digest = '0xABCDEF'
		const digestHash = await test.soliditySha3_sign(digest)
		const digestSignature = await getDigestSignature(digestHash, card)
		
		const v = [multisigSignature.v, blankCheckSignature.v, digestSignature.v, recipientSignature.v]
		const r = [multisigSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), recipientSignature.r.valueOf()]
		const s = [multisigSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), recipientSignature.s.valueOf()]

		var initialBalanceSender = await basicToken.balanceOf(multisig)
		var initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");

		const amount = web3.utils.toWei(blankCheckAmount, "ether")

		try {
			await zipperMS.redeemBlankCheck(addresses, signers, m, v, r, s, amount, [digestHash], {from: sponsor});
			assert(false, "transfer went through, but should have failed since contract's allowance is 0!")
		} catch (error) {
			// ERC20 will throw error here but there's no revert reason, otherwise it would have gotten propogated here
			assert(error.message.includes('VM Exception'), error.message)
		}

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check was incorrectly marked as cashed after failed transfer");
		
		// Approve multisig to transfer 1 ETH
		await basicToken.approve(zipperMS.address, amount, {from: multisig});
		await zipperMS.redeemBlankCheck(addresses, signers, m, v, r, s, amount, [digestHash], {from: sponsor});

		var newBalanceSender = await basicToken.balanceOf(multisig)
		var newBalanceRecipient = await basicToken.balanceOf(recipient)
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "amount did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "amount did not transfer to recipient");

		assert(await zipperMS.checkCashed(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");
	});

	it("should not allow a blank check to be cashed from a 1 of 1 multisig (with 2FA) if multisig lacks balance to cover amount", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, card]
		const m = [1, 1, 1, 1]
		const blankCheckAmount = "101"

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, blankCheckAmount)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const digest = '0xABCDEF'
		const digestHash = await test.soliditySha3_sign(digest)
		const digestSignature = await getDigestSignature(digestHash, card)
		
		const v = [multisigSignature.v, blankCheckSignature.v, digestSignature.v, recipientSignature.v]
		const r = [multisigSignature.r.valueOf(), blankCheckSignature.r.valueOf(), digestSignature.r.valueOf(), recipientSignature.r.valueOf()]
		const s = [multisigSignature.s.valueOf(), blankCheckSignature.s.valueOf(), digestSignature.s.valueOf(), recipientSignature.s.valueOf()]

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei(blankCheckAmount, "ether")
		await basicToken.approve(zipperMS.address, web3.utils.toWei(blankCheckAmount, "ether"), {from: multisig});

		try {
			await zipperMS.redeemBlankCheck(addresses, signers, m, v, r, s, amount, [digestHash], {from: sponsor});
			assert(false, "transfer went through, but should have failed since contract's balance < amount!")
		} catch (error) {
			// ERC20 will throw error here but there's no revert reason, otherwise it would have gotten propogated here
			assert(error.message.includes('VM Exception'), error.message)
		}

		assert(await zipperMS.checkCashed(multisig, verificationKey) === false, "check was incorrectly marked as cashed after failed transfer");
	});
});