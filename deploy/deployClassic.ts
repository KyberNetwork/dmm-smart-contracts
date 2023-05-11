import { Wallet, utils } from "zksync-web3";
import * as ethers from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import * as dotenv from 'dotenv';
dotenv.config();

task('deployClassic', 'deploy classic sc')
  .setAction(async (taskArgs, hre) => {
    console.log(`Running deploy script zkSync Era`);
    const wallet = new Wallet(process.env.PRIVATE_KEY);
    const deployer = new Deployer(hre, wallet);

    let admin = '0x96202931a23e5349f88D7bCF422AA3e4B811C758';
    let USDC = '0xB1fe0a5788596CE7e868916873C7D5219bD605Fd';
    let USDT = '0x1a928903A57e8b57243b8E6A0Aa751935451a618';
  
    const KyberFairLaunchV3 = await deployer.loadArtifact("KyberFairLaunchV3");

    let sc = await deployer.deploy(KyberFairLaunchV3, [admin, [USDC, USDT]]);
    console.log(`KyberFairLaunchV3 was deployed at ${sc.address}`);
  });
