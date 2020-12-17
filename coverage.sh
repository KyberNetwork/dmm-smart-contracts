#!/bin/sh

while getopts "f:" arg; do
  case $arg in
    f) FILE=$OPTARG;;
  esac
done

# because compile with coverage will change the bytecode of xyzswap pair so we must replace them
sed -i '.original' -e 's/091cf61156ea154bc288b0b6cc45d3908cf82196f6ed992f3d1754cd3e17e08f/0b4b43e774b81801859ca623aa5ee058a170454d9b658274bed895da0127dbd7/g' contracts/libraries/XYZSwapLibrary.sol
if [ -n "$FILE" ]
then
    yarn hardhat coverage --testfiles $FILE
else
    yarn hardhat coverage
fi
sed -i '.original' -e 's/0b4b43e774b81801859ca623aa5ee058a170454d9b658274bed895da0127dbd7/091cf61156ea154bc288b0b6cc45d3908cf82196f6ed992f3d1754cd3e17e08f/g' contracts/libraries/XYZSwapLibrary.sol
