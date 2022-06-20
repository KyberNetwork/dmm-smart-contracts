function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// the sleeps is to make sure the explorer's backend already propagated the bytecode of contracts
// also make sure not to exceeds request limit
async function runVerifyAndSleep({address, constructorArguments, sleepTime = 15000}) {
  if (hre.network.name === 'hardhat') return;
  try {
    await sleep(sleepTime);
    await hre.run('verify:verify', {
      address,
      constructorArguments,
    });
    await sleep(sleepTime);
  } catch (error) {
    console.log(`verify contract ${address} failed: ${error.message}`);
  }
}

module.exports = {
  runVerifyAndSleep,
};
