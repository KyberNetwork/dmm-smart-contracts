require('dotenv').config();

const fs = require('fs');
const path = require('path');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// this func both verify contracts code and export contracts deployment information
// the sleeps is to make sure the explorer's backend already propagated the bytecode of contracts
// also make sure not to exceeds request limit. It's recommended to wait for 5 confirmations
async function runVerifyAndExport({address, constructorArguments, toExport = true, outputFilename, sleepTime}) {
  if (hre.network.name === 'hardhat' || address === undefined) return;
  try {
    if (sleepTime === undefined)
      sleepTime = process.env.VERIFY_CODE_TIMEOUT != undefined ? process.env.VERIFY_CODE_TIMEOUT : 30000;
    await sleep(sleepTime);
    await hre.run('verify:verify', {
      address,
      constructorArguments,
    });
  } catch (error) {
    console.log(`verify contract ${address} failed: ${error.message}`);
  }

  if (toExport) {
    exportData({
      filename: outputFilename ? outputFilename : `out-${Date.now()}`,
      data: {
        address: address,
        constructorArguments: constructorArguments,
      },
    });
  }
}

function exportData({filename, data}) {
  try {
    if (hre.network.name != 'hardhat') {
      data['network'] = hre.network.name;
      filename = `${filename}-${hre.network.name}`;
    }
    let json = JSON.stringify(data, null, 2);
    fs.writeFileSync(path.join(__dirname, `${filename}.json`), json);
  } catch (error) {
    console.log(`exportData failed : ${error.message}`);
  }
}

module.exports = {
  runVerifyAndExport,
  exportData,
};
