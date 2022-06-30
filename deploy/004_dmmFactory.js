const {runVerify, deployIfNotExisted} = require('./helpers');

let dmmFactory = async ({getNamedAccounts}) => {
  const {deployer, dmmFactoryAddress} = await getNamedAccounts();

  const DMMFactory = await deployIfNotExisted({
    namedAddress: dmmFactoryAddress,
    deploymentName: 'DMMFactory',
    options: {
      from: deployer,
      contract: 'DMMFactory',
      args: [deployer],
      autoMine: true,
      log: true,
      skipIfAlreadyDeployed: true,
    },
  });

  await runVerify({
    address: DMMFactory.address,
    constructorArguments: [deployer],
  });
};
dmmFactory.tags = ['DMMFactory'];

module.exports = dmmFactory;
