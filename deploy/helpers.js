require('dotenv').config();

// this func will run verify and log if fails without throwing
async function runVerify({address, constructorArguments}) {
  try {
    if (['hardhat', 'localhost'].includes(hre.network.name)) return;
    await sleep(process.env?.VERIFY_CODE_TIMEOUT);
    await hre.run('verify:verify', {address, constructorArguments});
  } catch (e) {
    console.log(e.message);
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// if address `namedAddress` not set in hardhat.config for the deployment named `deploymentName`
// then deploy new one
// else save the deployment named `deploymentName` with that address `namedAddress`
// return a DeploymentResult
async function deployIfNotExisted({namedAddress, deploymentName, options}) {
  const {deploy, getArtifact, save, getOrNull} = hre.deployments;

  let deploymentResult = await getOrNull(deploymentName);
  if (!deploymentResult) {
    // check for hardhat and localhost network is involved in `default` of named address setting
    if (namedAddress === undefined || ['hardhat', 'localhost'].includes(hre.network.name)) {
      deploymentResult = await deploy(deploymentName, options);
    } else {
      await save(deploymentName, {
        address: namedAddress,
        abi: (await getArtifact(options.contract ? options.contract : deploymentName)).abi,
      });
      deploymentResult = await getOrNull(deploymentName);
    }
  }

  return deploymentResult;
}

async function deployWethIfDev({weth}) {
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

    return WETH.address;
  } else return weth;
}

module.exports = {runVerify, deployIfNotExisted, deployWethIfDev};
