const {runVerify, deployIfNotExisted, deployWethIfDev} = require('./helpers');

let dmm = async ({getNamedAccounts, deployments, network}) => {
  const {deploy} = deployments;
  const {deployer, dmmRouterAddress} = await getNamedAccounts();
  let {weth} = await getNamedAccounts();

  weth = await deployWethIfDev({weth});

  const DMMFactory = await deployments.get('DMMFactory');
  const DMMRouter = await deployIfNotExisted({
    namedAddress: dmmRouterAddress,
    deploymentName: 'DMMRouter02',
    options: {
      from: deployer,
      contract: 'DMMRouter02',
      args: [DMMFactory.address, weth],
      autoMine: true,
      log: true,
      skipIfAlreadyDeployed: true,
    },
  });

  await runVerify({
    address: DMMRouter.address,
    constructorArguments: [DMMFactory.address, weth],
  });
};
dmm.tags = ['DMM'];
dmm.dependencies = ['DMMFactory'];
dmm.runAtTheEnd = true;
module.exports = dmm;
