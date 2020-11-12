#!/bin/sh
# because compile with coverage will change the bytecode of uniswap pair so we must replace them
sed -i '.original' -e 's/0f218ad180f1a72cb24d7ad8fa648a9d96c804102c1728c200afe134c51ce0a7/6180fbc8b1689d3c855740582c5522936429c794bdc25e730d97bbda02ff508b/g' contracts/libraries/XYZSwapLibrary.sol
yarn buidler coverage
sed -i '.original' -e 's/6180fbc8b1689d3c855740582c5522936429c794bdc25e730d97bbda02ff508b/0f218ad180f1a72cb24d7ad8fa648a9d96c804102c1728c200afe134c51ce0a7/g' contracts/libraries/XYZSwapLibrary.sol
