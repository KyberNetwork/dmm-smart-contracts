const {Wallet} = require('zksync-web3');
const {Deployer} = require('@matterlabs/hardhat-zksync-deploy');
require('dotenv').config();

task('deployZkSync', 'deploy classic zkSync')
  .setAction(async (_, hre) => {
    console.log(`Running deploy script zkSync Era`);
  const wallet = new Wallet(process.env.PRIVATE_KEY);
  const deployer = new Deployer(hre, wallet);

  const WETH = process.env.ZK_FLAGS == '1' ? '0x5aea5775959fbc2557cc8789bc1bf90a239d9a91' : '0x36fE8F80Cb53925709a9B12e45D36CfC6C8E5be3';
  let admin = process.env.ADMIN_FACTORY;

  const KSFactory = await deployer.loadArtifact("KSFactory");
  const KSRouter02 = await deployer.loadArtifact("KSRouter02");
  const KSZap = await deployer.loadArtifact("KSZap");

  let scFac = await deployer.deploy(KSFactory, [admin]);
  let scRouter = await deployer.deploy(KSRouter02, [scFac.address, WETH]);
  let scZap = await deployer.deploy(KSZap, [scFac.address, WETH]);
  
  console.log(`Factory was deployed at ${scFac.address}`);
  console.log(`KSRouter02 was deployed at ${scRouter.address}`);
  console.log(`KSZap was deployed at ${scZap.address}`);

  });
