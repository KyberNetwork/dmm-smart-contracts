const {runVerify, deployIfNotExisted, deployWethIfDev} = require('./helpers');

let kyberswap = async ({getNamedAccounts, deployments, network}) => {
  const {deployer, ksRouterStaticFeesAddress} = await getNamedAccounts();
  let {weth} = await getNamedAccounts();

  weth = await deployWethIfDev({weth});

  const KSFactory = await deployments.get('KSFactory');
  const KSRouter02 = await deployIfNotExisted({
    namedAddress: ksRouterStaticFeesAddress,
    deploymentName: 'KSRouter02',
    options: {
      from: deployer,
      contract: 'KSRouter02',
      args: [KSFactory.address, weth],
      autoMine: true,
      log: true,
      skipIfAlreadyDeployed: true,
    },
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
