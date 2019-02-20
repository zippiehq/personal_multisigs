const TestFunctions = artifacts.require("./TestFunctions.sol");
const BasicERC20Mock = artifacts.require("./BasicERC20Mock.sol");
const ZippieWallet = artifacts.require("./ZippieWallet.sol");
const ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const {
	getMultisigSignature,
	getRecipientSignature,
	getSignature,
	getBlankCheckSignature,
	getSignatureFrom3,
 } = require("./HelpFunctions");
 
contract("Test Zippie Multisig Check Cashing Functionality", (accounts) => {

	let basicToken;
	let zippieCardNonces;
	let zippieWallet;

	const signer = accounts[0] // multisig signer (1of1)
	const signer2 = accounts[2] // multisig signer (2of2)
	const recipient = accounts[2]
	const verificationKey = accounts[4] // random verification key
	const multisig = accounts[5] // multisig wallet (sender, don't sign with this account since the private key should be forgotten at creation)
	const sponsor = accounts[6] // Zippie PMG server

	beforeEach(() => {
		return TestFunctions.new().then(_ => {
				return BasicERC20Mock.new(accounts[5]).then(instance => {
					basicToken = instance;
					return ZippieCardNonces.new().then(instance => {
						zippieCardNonces = instance
						return ZippieWallet.new(zippieCardNonces.address)}).then(instance => {
							 zippieWallet = instance;
							return basicToken.approve(instance.address, web3.utils.toWei("100", "ether"), {from: accounts[5]});
				});
			});
		});
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig, and fail the second time", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer]
		const m = [1, 1, 0, 0]

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, "1")
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignatureFrom3(multisigSignature, blankCheckSignature, recipientSignature)
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei("1", "ether")
		await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
		
		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "balance did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "balance did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");

		try {
			// try the same exact transfer 			
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
			assert(false, "duplicate transfer went through, but should have failed!")
		} catch(error) {
			assert(error.reason === "Nonce already used", error.reason)
		}
	});

	it("should allow a blank check to be cashed from a 2 of 2 multisig", async () => {
		const addresses = [multisig, basicToken.address, recipient, verificationKey]
		const signers = [signer, signer2]
		const m = [2, 2, 0, 0]
		const blankCheckAmount = "1"

		const multisigSignature = await getMultisigSignature(signers, m, multisig)
		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, blankCheckAmount)
		const blankCheckSignature2 = await getBlankCheckSignature(verificationKey, signer2, blankCheckAmount)
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(multisigSignature, blankCheckSignature, blankCheckSignature2, recipientSignature)

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === false, "check already marked as cashed before transfer");
		
		const amount = web3.utils.toWei(blankCheckAmount, "ether")
		await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, amount, [], {from: sponsor});
		
		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "balance did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "balance did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === true, "check has not been marked as cashed after transfer");
	});
});