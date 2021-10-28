const ZapIn = artifacts.require('ZapIn');

async function main () {
  const wethAddress = '0xc778417e063141139fce010982780140aa0cd5ab';
  const factoryAddress = '0x0639542a5cd99bd5f4e85f58cb1f61d8fbe32de9';

  const zapIn = await ZapIn.new(factoryAddress, wethAddress);
  console.log('zapIn deployed to:', zapIn.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
