require('@nomiclabs/hardhat-truffle5');
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-web3');
require('@nomiclabs/hardhat-etherscan');
require('hardhat-contract-sizer');
require('solidity-coverage');
require('hardhat-deploy');
require('dotenv').config();

task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await web3.eth.getAccounts();

  for (const account of accounts) {
    console.log(account);
  }
});

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    ],
    overrides: {
      'contracts/periphery/KSRouter02.sol': {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 9999,
          },
        },
      },
    },
  },
  defaultNetwork: 'hardhat',
  namedAccounts: {
    weth: {
      mainnet: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 
      rinkeby: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
      ropsten: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
      goerli: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
      kovan: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
      polygon: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
      polygon_testnet: '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa',
      avax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      avax_testnet: '0xB767287A7143759f294CfB7b1Adbca1140F3de71',
      cronos: '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23',
      ftm: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
      ftm_testnet: '0x84C7dD519Ea924bf1Cf6613f9127F26D7aB801D0',
      arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      arbitrum_testnet: '0x207eD1742cc0BeBD03E50e855d3a14E41f93A461',
      aurora: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
      oasis: '0x21C718C22D52d0F3a789b752D4c2fD5908a8A733',
      optimism: '0x4200000000000000000000000000000000000006',
      optimism_testnet: '0x4200000000000000000000000000000000000006',
      bsc: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
      bttc: '0x8d193c6efa90bcff940a98785d1ce9d093d3dc8a',
      velas: '0xc579D1f3CF86749E05CD06f7ADe17856c2CE3126',
    },
    deployer: 0,
    ksFactoryAddress: {
      // already deployed ks factory contract addresses
      default: '0x1c758aF0688502e49140230F6b0EBd376d429be5',
      ropsten: '0xB332f6145A5b064f58FF9793ba3523245F8fafaC',
      rinkeby: '0x1811E801C09CCDa73b50fB3493254d05e9aE641F',
      aurora: '0x39a8809fbbf22ccaeac450eaf559c076843eb910',
      arbitrum: '0x51E8D106C646cA58Caf32A47812e95887C071a62',
      arbitrum_testnet: '0x9D4ffbf49cc21372c2115Ae4C155a1e5c0aACf36',
    },
    dmmFactoryAddress: {
      // already deployed dmm factory contract addresses
      mainnet: '0x833e4083B7ae46CeA85695c4f7ed25CDAd8886dE',
      ropsten: '0x0639542a5cd99bd5f4e85f58cb1f61d8fbe32de9',
      polygon: '0x5F1fe642060B5B9658C15721Ea22E982643c095c',
      polygon_testnet: '0x7900309d0b1c8D3d665Ae40e712E8ba4FC4F5453',
      bsc_testnet: '0x7900309d0b1c8D3d665Ae40e712E8ba4FC4F5453',
      bsc: '0x878dFE971d44e9122048308301F540910Bbd934c',
      avax_testnet: '0x878dFE971d44e9122048308301F540910Bbd934c',
      avax: '0x10908C875D865C66f271F5d3949848971c9595C9',
      ftm_testnet: '0x10908C875D865C66f271F5d3949848971c9595C9',
      ftm: '0x78df70615ffc8066cc0887917f2Cd72092C86409',
      cronos: '0xD9bfE9979e9CA4b2fe84bA5d4Cf963bBcB376974',
      aurora: '0xD9bfE9979e9CA4b2fe84bA5d4Cf963bBcB376974',
      arbitrum: '0xD9bfE9979e9CA4b2fe84bA5d4Cf963bBcB376974',
      bttc: '0xD9bfE9979e9CA4b2fe84bA5d4Cf963bBcB376974',
      oasis: '0xD9bfE9979e9CA4b2fe84bA5d4Cf963bBcB376974',
    },
    // add more named addresses if needed
  },
  networks: {
    hardhat: {
      saveDeployments: true,
      live: false,
      blockGasLimit: 12500000,
      initialBaseFeePerGas: 0,
      accounts: [
        // 20 accounts with 10^14 ETH each
        // Addresses:
        //   0xc783df8a850f42e7f7e57013759c285caa701eb6
        //   0xead9c93b79ae7c1591b1fb5323bd777e86e150d4
        //   0xe5904695748fe4a84b40b3fc79de2277660bd1d3
        //   0x92561f28ec438ee9831d00d1d59fbdc981b762b2
        //   0x2ffd013aaa7b5a7da93336c2251075202b33fb2b
        //   0x9fc9c2dfba3b6cf204c37a5f690619772b926e39
        //   0xfbc51a9582d031f2ceaad3959256596c5d3a5468
        //   0x84fae3d3cba24a97817b2a18c2421d462dbbce9f
        //   0xfa3bdc8709226da0da13a4d904c8b66f16c3c8ba
        //   0x6c365935ca8710200c7595f0a72eb6023a7706cd
        //   0xd7de703d9bbc4602242d0f3149e5ffcd30eb3adf
        //   0x532792b73c0c6e7565912e7039c59986f7e1dd1f
        //   0xea960515f8b4c237730f028cbacf0a28e7f45de0
        //   0x3d91185a02774c70287f6c74dd26d13dfb58ff16
        //   0x5585738127d12542a8fd6c71c19d2e4cecdab08a
        //   0x0e0b5a3f244686cf9e7811754379b9114d42f78b
        //   0x704cf59b16fd50efd575342b46ce9c5e07076a4a
        //   0x0a057a7172d0466aef80976d7e8c80647dfd35e3
        //   0x68dfc526037e9030c8f813d014919cc89e7d4d74
        //   0x26c43a1d431a4e5ee86cd55ed7ef9edf3641e901
        {
          privateKey: '7cdacbed2bb84ba6d76819ef2e9ac18829c6b45d06ae57592e855fa212b4428f',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0xd49743deccbccc5dc7baa8e69e5be03298da8688a15dd202e20f15d5e0e9a9fb',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x23c601ae397441f3ef6f1075dcb0031ff17fb079837beadaf3c84d96c6f3e569',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x87630b2d1de0fbd5044eb6891b3d9d98c34c8d310c852f98550ba774480e47cc',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x275cc4a2bfd4f612625204a20a2280ab53a6da2d14860c47a9f5affe58ad86d4',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x7f307c41137d1ed409f0a7b028f6c7596f12734b1d289b58099b99d60a96efff',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x2a8aede924268f84156a00761de73998dac7bf703408754b776ff3f873bcec60',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x8b24fd94f1ce869d81a34b95351e7f97b2cd88a891d5c00abc33d0ec9501902e',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29085',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29086',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29087',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29088',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29089',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908a',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908b',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908c',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908d',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908e',
          balance: '100000000000000000000000000000000',
        },
        {
          privateKey: '0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908f',
          balance: '100000000000000000000000000000000',
        },
      ],
    },
  },
  mocha: {
    enableTimeouts: false,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    deploy: './deploy',
    deployments: './deployments',
    imports: './imports',
  },
};

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (INFURA_API_KEY != undefined && PRIVATE_KEY != undefined) {
  module.exports.networks.kovan = {
    url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.rinkeby = {
    url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
    blockGasLimit: 30000000,
  };

  module.exports.networks.ropsten = {
    url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.mainnet = {
    url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.bsc_testnet = {
    url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
    blockGasLimit: 30000000,
  };

  module.exports.networks.bsc = {
    url: `https://bsc-dataseed1.ninicoin.io/`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.cronos_testnet = {
    url: `https://cronos-testnet-3.crypto.org:8545/`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.cronos = {
    url: `https://evm-cronos.crypto.org/`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.aurora_testnet = {
    url: `https://testnet.aurora.dev/`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.aurora = {
    url: `https://mainnet.aurora.dev/`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.polygon_testnet = {
    url: `https://rpc-mumbai.maticvigil.com/`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.polygon = {
    url: `https://polygon-rpc.com/`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.avax_testnet = {
    url: `https://api.avax-test.network/ext/bc/C/rpc`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.avax = {
    url: `https://api.avax.network/ext/bc/C/rpc`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.fantom_testnet = {
    url: `https://rpc.testnet.fantom.network/`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.fantom = {
    url: `https://rpc.ftm.tools/`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.optimism = {
    url: `https://optimistic.etherscan.io`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.optimism_testnet = {
    url: `https://kovan.optimism.io`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.arbitrum = {
    url: `https://arb1.arbitrum.io/rpc`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.arbitrum_testnet = {
    url: `https://rinkeby.arbitrum.io/rpc`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.bttc = {
    url: `https://bttc.dev.kyberengineering.io`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.bttc_testnet = {
    url: `https://pre-rpc.bt.io`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.oasis = {
    url: `https://emerald.oasis.dev`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.oasis_testnet = {
    url: `https://testnet.emerald.oasis.dev`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.velas = {
    url: `https://evmexplorer.velas.com/rpc`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };

  module.exports.networks.velas_testnet = {
    url: `https://explorer.testnet.velas.com/rpc`,
    accounts: [PRIVATE_KEY],
    timeout: 20000,
  };
}

Object.keys(module.exports.networks).map((k) => {
  if (!['hardhat', 'localhost'].includes(k))
    module.exports.networks[k] = {...module.exports.networks[k], saveDeployments: true, live: true};
});

const envValueOrEmpty = (envKey) => (process.env[envKey] != undefined ? process.env[envKey] : '');

module.exports.etherscan = {
  // Your API key for Etherscan
  // Obtain one at https://etherscan.io/
  apiKey: {
    bscTestnet: envValueOrEmpty('BSCSCAN_API_KEY'),
    bsc: envValueOrEmpty('BSCSCAN_API_KEY'),
    mainnet: envValueOrEmpty('ETHERSCAN_API_KEY'),
    ropsten: envValueOrEmpty('ETHERSCAN_API_KEY'),
    rinkeby: envValueOrEmpty('ETHERSCAN_API_KEY'),
    goerli: envValueOrEmpty('ETHERSCAN_API_KEY'),
    kovan: envValueOrEmpty('ETHERSCAN_API_KEY'),
    optimisticEthereum: envValueOrEmpty('ETHERSCAN_API_KEY'),
    optimisticKovan: envValueOrEmpty('ETHERSCAN_API_KEY'),
    polygon: envValueOrEmpty('ETHERSCAN_API_KEY'),
    polygonMumbai: envValueOrEmpty('ETHERSCAN_API_KEY'),
    arbitrumOne: envValueOrEmpty('ETHERSCAN_API_KEY'),
    arbitrumTestnet: envValueOrEmpty('ETHERSCAN_API_KEY'),
    avalanche: envValueOrEmpty('ETHERSCAN_API_KEY'),
    avalancheFujiTestnet: envValueOrEmpty('ETHERSCAN_API_KEY'),
    opera: envValueOrEmpty('ETHERSCAN_API_KEY'), // Fantom mainnet
    ftmTestnet: envValueOrEmpty('ETHERSCAN_API_KEY'),
  },
};

// module.exports.etherscan = {
//   customChains:[
//     {
//       network: "rinkeby",
//       chainId: 4,
//       urls: {
//         apiURL: "https://api-rinkeby.etherscan.io/api",
//         browserURL: "https://rinkeby.etherscan.io"
//       }
//     }
//   ]
// }
