const {ethers} = require('hardhat');
const {utils, Wallet, Provider, Contract, ContractFactory} = require('zksync-web3');
require('dotenv').config();
const {Deployer} = require('@matterlabs/hardhat-zksync-deploy');
const {BigNumber} = require('ethers');

module.exports = async (hre) => {
  

  const zkSyncProvider = new Provider(hre.network.config.url);

  

  const wallet = new Wallet(process.env.PRIVATE_KEY, zkSyncProvider);

  
  const deployer = new Deployer(hre, wallet);

  const KSFactory = await deployer.loadArtifact('KSFactory');


  let gasPrice = await wallet.provider.getGasPrice();

  let gasLimit = await deployer.estimateDeployGas(KSFactory, [wallet.address]);


  let tx = await deployer.deploy(KSFactory, [wallet.address], {
    customData: {
      gasPerPubdata: 50000,
    },
    gasLimit: gasLimit,
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: BigNumber.from(0),
  });

  console.log(tx);
};

module.exports.tags = ['MyContract'];
