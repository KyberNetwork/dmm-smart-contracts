# Dynamic Automated Market Maker
## Introduction
[![built-with openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-3677FF)](https://docs.openzeppelin.com/)
[![Build Status](https://api.travis-ci.com/dynamic-amm/smart-contracts.svg?branch=master&status=passed)](https://travis-ci.com/github/KyberNetwork/kyber_reserves_sc)

This repository contains the dynamic-amm smart contracts.
For more details, please visit the white paper([dynamic fee](https://github.com/dynamic-amm/dmm-protocol/blob/main/xyz.pdf)  and [amplfication algorithm](https://github.com/dynamic-amm/dmm-protocol/blob/main/apr_v2.pdf))and our [change log](CHANGELOG.md) (compared to uniswap)

## Package Manager
We use `yarn` as the package manager. You may use `npm` and `npx` instead, but commands in bash scripts may have to be changed accordingly.

## Requirements
- The following assumes the use of `node@>=10`
# Setup
For interactions or contract deployments on public testnets / mainnet, create a .env file specifying your private key and infura api key, with the following format:
```
INFURA_API_KEY = 'xxxxx'
ETHERSCAN_API_KEY = 'xxxxx'
PRIVATE_KEY = 'xxxxx'
MATIC_VIGIL_KEY = 'xxxxx'
```

## Install Dependencies

`yarn`

## Compile Contracts

`yarn compile`

## Run Tests

`yarn test`

## Run coverage

`./coverage.sh`

--- 
## Deploy
`npx hardhat deploy`
Example: `npx hardhat deploy --tags KyberSwap --network rinkeby --gasprice 30000000`
#### Options
`--export <filepath>`: export one file that contains all contracts (address, abi + extra data) for the network being invoked. The file contains the minimal information so to not bloat your frontend.
`--export-all <filepath>`: export one file that contains all contracts across all saved deployments, regardless of the network being invoked.
`--tags <tags>`: only excute deploy scripts with the given tags (separated by commas) and their dependencies
`--gasprice <gasprice>` : specify the gasprice (in wei) to use by default for transactions executed via hardhat-deploy helpers in deploy scripts
#### Flags
`--reset`: This flag resets the deployments from scratch. Previously deployed contract are not considered and deleted from disk.
`--silent`: This flag remove hardhat-deploy log output (see log function and log options for hre.deployments)
`--watch`: This flag make the task never ending, watching for file changes in the deploy scripts folder and the contract source folder. If any changes happen the contracts are recompiled and the deploy script are re-run. Combined with a proxy deployment (Proxies or Diamond) this allow to have HCR (Hot Contract Replacement).

---

### How to deploy on zkSync
- Update `ZK_FLAGS` env to
  `0` default, not using zkSync network
  `1` if using mainnet
  `2` if using testnet
- `yarn hardhat compile --network zkSyncNetwork`
- `yarn hardhat deployZkSync --network zkSyncNetwork`
