const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// this sleep is for ensuring that request rate to scan API not exceeds limit
async function runVerifyAndSleep({address, constructorArguments, sleepTime = 30000}) {
  if (hre.network.name != 'hardhat') {
    try {
      await hre.run('verify:verify', {
        address,
        constructorArguments,
      });
      await sleep(sleepTime);
    } catch (error) {
      console.log(
        `runVerifyAndSleep at address ${address} with constructorArgs ${constructorArguments.toString()} failed!`
      );
    }
  }
}

module.exports = {
  runVerifyAndSleep,
};
