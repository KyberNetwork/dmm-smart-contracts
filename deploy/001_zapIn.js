const {runVerify} = require('./helpers');

let zapIn = async ({getNamedAccounts, deployments, getChainId}) => {
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

  const ZapIn = await deploy('ZapIn', {
    from: deployer,
    args: [DMMFactory.address, weth],
    autoMine: true,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  await runVerify({
    address: ZapIn.address,
    constructorArguments: [DMMFactory.address, weth],
  });
};
zapIn.tags = ['ZapIn'];
zapIn.dependencies = ['DMMFactory'];
module.exports = zapIn;
