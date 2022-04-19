// More information about configuration can be found at:
// truffleframework.com/docs/advanced/configuration
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
    networks: {
        development: {
            host: 'localhost',
            port: 8545,
            network_id: '*', // Match any network id
            websockets: true
        },
        zippienet: {
            provider: () =>
                // Change pivatekey to account to deploy from
                new HDWalletProvider(
                    '0000000000000000000000000000000000000000000000000000000000000000',
                    'https://zippienet-eth.dev.zippie.org/rpc',
                    0,
                    1
                ),
            network_id: '*' // Match any network id
        }
    },
    compilers: {
        solc: {
            version: '0.6.7',
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                },
            }
        }
    },
    mocha: {
        timeout: 120000, // prevents tests from failing when pc is under heavy load
    },
};
