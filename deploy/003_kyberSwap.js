const {runVerify} = require('./helpers');

let kyberswap = async ({getNamedAccounts, deployments, getChainId, network}) => {
  const {deploy} = deployments;
  const {deployer, ksFactoryAddress} = await getNamedAccounts();
  let {weth} = await getNamedAccounts();

  // deploy mock weth if local chain
  if (['hardhat', 'localhost'].includes(network.name) && weth == undefined) {
    // hardhat chainId
    WETH = await deploy('WETH9', {
      from: deployer,
      args: [],
      autoMine: true,
      log: true,
      skipIfAlreadyDeployed: true,
    });
    weth = WETH.address;
  }

  const KSFactory = await deployments.get('KSFactory');
  const KSRouter02 = await deploy('KSRouter02', {
    from: deployer,
    contract: 'KSRouter02',
    args: [KSFactory.address, weth],
    autoMine: true,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  await runVerify({
    address: KSRouter02.address,
    constructorArguments: [KSFactory.address, weth],
  });
};
kyberswap.tags = ['KyberSwap'];
kyberswap.dependencies = ['KSFactory'];
kyberswap.runAtTheEnd = true;
module.exports = kyberswap;
