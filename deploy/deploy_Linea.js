const hre = require("hardhat");

async function main () {
  const wethAddress = '0x2C1b868d6596a18e32E61B901E4060C872647b6C';
  const feeToS = '0x96202931a23e5349f88D7bCF422AA3e4B811C758';

  const KSFactory = await hre.ethers.getContractFactory("KSFactory");
  const KSRouter02 = await hre.ethers.getContractFactory("KSRouter02");

  const factory = await KSFactory.deploy(feeToS);
  await factory.deployed();

  const router = await KSRouter02.deploy(factory.address, wethAddress);
  await router.deployed();


  console.log('Factory deployed to:', factory.address);
  console.log('Router deployed to:', router.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
