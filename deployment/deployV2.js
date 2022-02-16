const DMMFactory = artifacts.require('DMMFactoryV2');
const DMMRouter02 = artifacts.require('DMMRouter02');
const BN = web3.utils.BN;
const FACTOR_IN_PRECISION = new BN(0.3);

async function main() {
  const wethAddress = '0xc778417e063141139fce010982780140aa0cd5ab';
  const accounts = await web3.eth.getAccounts();
  const FACTOR_IN_PRECISION = new BN(0.3);

  // We get the contract to deploy
  const factory = await DMMFactory.new(accounts[0], FACTOR_IN_PRECISION);
  console.log('Factory V2 deployed to:', factory.address);

  const router = await DMMRouter02.new(factory.address, wethAddress);
  console.log('Router deployed to:', router.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
