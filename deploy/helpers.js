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

module.exports = {runVerify};
