const hre = require("hardhat");

async function main () {
  const wethAddress = '0x2C1b868d6596a18e32E61B901E4060C872647b6C';
  const feeToS = '0x4f82e73EDb06d29Ff62C91EC8f5Ff06571bdeb29';

  const KSFactory = await hre.ethers.getContractFactory("KSFactory");
  const KSRouter02 = await hre.ethers.getContractFactory("KSRouter02");
  const KSZap = await hre.ethers.getContractFactory("KSZap");

  const factory = await KSFactory.deploy(feeToS);
  await factory.deployed();

  const router = await KSRouter02.deploy(factory.address, wethAddress);
  await router.deployed();

  const zap = await KSZap.deploy(factory.address, wethAddress);
  await zap.deployed();

  console.log('Factory deployed to:', factory.address);
  console.log('Router deployed to:', router.address);
  console.log('Zap deployed to:', zap.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
