const {runVerify} = require('./helpers');

let ksFactory = async ({getNamedAccounts, deployments, getChainId}) => {
  const {deploy,save, getArtifact} = deployments;
  const {deployer, ksFactoryAddress} = await getNamedAccounts();


  // if ksFactory is already deployed (setup in hardhat config), save to deployments path
  // else deploy new one and save deployment
  if (ksFactoryAddress == undefined) {
    const KSFactory = await deploy('KSFactory', {
      from: deployer,
      contract: 'KSFactory',
      args: [deployer],
      autoMine: true,
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await runVerify({
      address: KSFactory.address,
      constructorArguments: [deployer],
    });
  } else {
    await save('KSFactory', {
      address: ksFactoryAddress,
      abi: (await getArtifact('KSFactory')).abi,
    });
  }
};
ksFactory.tags = ['KSFactory'];

module.exports = ksFactory;
