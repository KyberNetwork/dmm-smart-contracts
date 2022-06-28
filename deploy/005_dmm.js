const {runVerify} = require('./helpers');

let dmm = async ({getNamedAccounts, deployments, getChainId, network}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  let {weth} = await getNamedAccounts();

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

  const DMMFactory = await deployments.get('DMMFactory');
  const DMMRouter = await deploy('DMMRouter02', {
    from: deployer,
    contract: 'DMMRouter02',
    args: [DMMFactory.address, weth],
    autoMine: true,
    log: true,
    skipIfAlreadyDeployed: true,
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
