// More information about configuration can be found at:
// truffleframework.com/docs/advanced/configuration

module.exports = {
	networks: {
		development: {
			host: "localhost",
			port: 8545,
			network_id: "*", // Match any network id
			websockets: true
		}
	},
	compilers: {
    solc: {
      version: "0.5.9", 
			settings: {
				optimizer: {
					enabled: true,
					runs: 200
				},
				evmVersion: "petersburg"
			}
		}
	}
};
