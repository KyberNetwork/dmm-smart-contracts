const {runVerify} = require('./helpers');

let dmmFactory = async ({getNamedAccounts, deployments, getChainId}) => {
  const {deploy, save, getArtifact} = deployments;
  const {deployer, dmmFactoryAddress} = await getNamedAccounts();

  // if dmmFactory is already deployed (setup in hardhat config), save to deployments path
  // else deploy new one and save deployment
  if (dmmFactoryAddress == undefined) {
    const DMMFactory = await deploy('DMMFactory', {
      from: deployer,
      contract: 'DMMFactory',
      args: [deployer],
      autoMine: true,
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await runVerify({
      address: DMMFactory.address,
      constructorArguments: [deployer],
    });
  } else {
    await save('DMMFactory', {
      address: dmmFactoryAddress,
      abi: (await getArtifact('DMMFactory')).abi,
    });
  }
};
dmmFactory.tags = ['DMMFactory'];

module.exports = dmmFactory;
