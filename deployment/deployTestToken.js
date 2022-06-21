const {artifacts} = require('hardhat');
const {runVerifyAndExport} = require('./helper');

const BN = web3.utils.BN;

async function main() {
  const accounts = await web3.eth.getAccounts();
  // We get the contract to deploy

  let amount = new BN(10).pow(new BN(27));
  const TestToken = await artifacts.require('TestToken');
  const token = await TestToken.new('token 1', 't1', amount);
  console.log('TestToken deployed to:', token.address);

  await runVerifyAndExport({
    address: token.address,
    constructorArguments: ['token 1', 't1', amount.toString()],
    outputFilename: 'test-token1',
  });

  const MockFeeOnTransferERC20 = artifacts.require('MockFeeOnTransferERC20');
  const token2 = await MockFeeOnTransferERC20.new('fee on transfer token', 'FOT', amount);
  console.log('FOT token deployed to:', token2.address);
  await runVerifyAndExport({
    address: token2.address,
    constructorArguments: ['fee on transfer token', 'FOT', amount.toString()],
    outputFilename: 'test-token2',
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
