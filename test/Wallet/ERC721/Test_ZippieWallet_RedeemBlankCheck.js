const BasicERC721Mock = artifacts.require("./BasicERC721Mock.sol");
const ZippieWallet = artifacts.require("./ZippieWalletERC721.sol");
const ZippieCardNonces = artifacts.require("./ZippieCardNonces.sol");

const {
	getAccountAddress,
	getRecipientSignature,
	getSignature,
	getBlankCheckSignature,
	getSignatureNoCard,
	ZERO_ADDRESS,
 } = require("./HelpFunctions");
 
contract("Test Zippie Multisig Check Cashing Functionality", (accounts) => {

	let basicToken;
	let zippieCardNonces;
	let zippieWallet;

	const signer = accounts[0] // multisig signer (1of1)
	const signer2 = accounts[2] // multisig signer (2of2)
	const recipient = accounts[2]
	const verificationKey = accounts[4] // random verification key
	const sponsor = accounts[6] // Zippie PMG server

	beforeEach(() => {
		return BasicERC721Mock.new(sponsor).then(instance => {
			basicToken = instance;
			return ZippieCardNonces.new().then(instance => {
				zippieCardNonces = instance
				return ZippieWallet.new(zippieCardNonces.address).then(instance => {
					zippieWallet = instance;
				});
			});
		});
	});

	it("should allow a blank check to be cashed once from a 1 of 1 multisig, and fail the second time", async () => {
		const signers = [signer]
		const m = [1, 1, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignatureNoCard(blankCheckSignature, recipientSignature)
		
		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === ZERO_ADDRESS, "check already marked as cashed before transfer");
		
		await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [], {from: sponsor});
		
		const amount = "1"
		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)	
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "token did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "token did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === recipient, "check has not been marked as cashed after transfer");

		try {
			// try the same exact transfer 			
			await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [], {from: sponsor});
			assert(false, "duplicate transfer went through, but should have failed!")
		} catch(error) {
			assert(error.reason === "Nonce already used", error.reason)
		}
	});

	it("should allow a blank check to be cashed from a 2 of 2 multisig", async () => {
		const signers = [signer, signer2]
		const m = [2, 2, 0, 0]
		const multisig = getAccountAddress(signers, m, zippieWallet.address)
		const tokenId = "1"
		await basicToken.transferFrom(sponsor, multisig, tokenId, {from: sponsor});
		const addresses = [basicToken.address, recipient, verificationKey]

		const blankCheckSignature = await getBlankCheckSignature(verificationKey, signer, tokenId, addresses[0])
		const blankCheckSignature2 = await getBlankCheckSignature(verificationKey, signer2, tokenId, addresses[0])
		const recipientSignature = await getRecipientSignature(recipient, verificationKey)

		const signature = getSignature(blankCheckSignature, blankCheckSignature2, recipientSignature)

		const initialBalanceSender = await basicToken.balanceOf(multisig)
		const initialBalanceRecipient = await basicToken.balanceOf(recipient)
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === ZERO_ADDRESS, "check already marked as cashed before transfer");
		
		await zippieWallet.redeemBlankCheck(addresses, signers, m, signature.v, signature.r, signature.s, tokenId, [], {from: sponsor});
		
		const amount = "1"
		const newBalanceSender = await basicToken.balanceOf(multisig)
		const newBalanceRecipient = await basicToken.balanceOf(recipient)
		assert((initialBalanceSender - newBalanceSender).toString() === amount, "token did not transfer from sender");
		assert((newBalanceRecipient - initialBalanceRecipient).toString() === amount, "token did not transfer to recipient");
		assert(await zippieWallet.usedNonces(multisig, verificationKey) === recipient, "check has not been marked as cashed after transfer");
	});
});