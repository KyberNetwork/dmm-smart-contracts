const {runVerify, deployWethIfDev, deployIfNotExisted} = require('./helpers');

let zapIn = async ({getNamedAccounts, deployments}) => {
  const {deployer, zapInStaticFeesAddress} = await getNamedAccounts();
  let {weth} = await getNamedAccounts();

  weth = await deployWethIfDev({weth});
  const DMMFactory = await deployments.get('DMMFactory');
  const ZapIn = await deployIfNotExisted({
    namedAddress: zapInStaticFeesAddress,
    deploymentName: 'ZapIn',
    options: {
      from: deployer,
      args: [DMMFactory.address, weth],
      autoMine: true,
      log: true,
      skipIfAlreadyDeployed: true,
    },
  });

  await runVerify({
    address: ZapIn.address,
    constructorArguments: [DMMFactory.address, weth],
  });
};
zapIn.tags = ['ZapIn'];
zapIn.dependencies = ['DMMFactory'];
module.exports = zapIn;
