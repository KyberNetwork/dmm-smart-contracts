#!/bin/sh

while getopts "f:" arg; do
  case $arg in
    f) FILE=$OPTARG;;
  esac
done

# because compile with coverage will change the bytecode of xyzswap pair so we must replace them
sed -i '.original' -e 's/0987abbad83bad36269e76587b466470d3b07f387029a24456453f76cf3fbfd5/5f98e7ef0373e89054ca329901db9d3b02410f3b62e4099a2a9e216c3982fab6/g' contracts/libraries/XYZSwapLibrary.sol
if [ -n "$FILE" ]
then
    yarn hardhat coverage --testfiles $FILE
else
    yarn hardhat coverage
fi
sed -i '.original' -e 's/5f98e7ef0373e89054ca329901db9d3b02410f3b62e4099a2a9e216c3982fab6/0987abbad83bad36269e76587b466470d3b07f387029a24456453f76cf3fbfd5/g' contracts/libraries/XYZSwapLibrary.sol
