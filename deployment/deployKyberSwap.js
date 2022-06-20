const KSFactory = artifacts.require('KSFactory');
const KSRouter02 = artifacts.require('KSRouter02');
const BN = web3.utils.BN;

async function main() {
  const wethAddress = '0xB47e6A5f8b33b3F17603C83a0535A9dcD7E32681';
  const accounts = await web3.eth.getAccounts();

  console.log(`Deployer: ${accounts[0]}`);

  // We get the contract to deploy
  const factory = await KSFactory.new(accounts[0]);
  console.log('Factory V2 deployed to:', factory.address);


  await runVerifyAndSleep({
    address: factory.address,
    constructorArguments: [accounts[0]],
    sleepTime: 30000,
  });

  const router = await KSRouter02.new(factory.address, wethAddress);
  console.log('Router deployed to:', router.address);
  await runVerifyAndSleep({
    address: router.address,
    constructorArguments: [factory.address, wethAddress],
    sleepTime: 30000,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
