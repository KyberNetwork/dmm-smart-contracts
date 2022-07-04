const {runVerify, deployIfNotExisted} = require('./helpers');

let ksFactory = async ({getNamedAccounts}) => {
  const {deployer, ksFactoryStaticFeesAddress} = await getNamedAccounts();

  const KSFactory = await deployIfNotExisted({
    namedAddress: ksFactoryStaticFeesAddress,
    deploymentName: 'KSFactory',
    options: {
      from: deployer,
      contract: 'KSFactory',
      args: [deployer],
      autoMine: true,
      log: true,
      skipIfAlreadyDeployed: true,
    },
  });
  await runVerify({
    address: KSFactory.address,
    constructorArguments: [deployer],
  });
};
ksFactory.tags = ['KSFactory'];

module.exports = ksFactory;
