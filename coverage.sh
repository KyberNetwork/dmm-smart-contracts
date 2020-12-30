#!/bin/sh

while getopts "f:" arg; do
  case $arg in
    f) FILE=$OPTARG;;
  esac
done

# because compile with coverage will change the bytecode of xyzswap pair so we must replace them
sed -i '.original' -e 's/f6eae63ebbc500de6e7310fc6568df4e6a4514aac0d3d423da5e4e3f332d04f5/9d67b22164f588080076b0fa437427f0b7e3c4473c29456c492d6f08a93e37f4/g' contracts/libraries/XYZSwapLibrary.sol
if [ -n "$FILE" ]
then
    yarn hardhat coverage --testfiles $FILE
else
    yarn hardhat coverage
fi
sed -i '.original' -e 's/9d67b22164f588080076b0fa437427f0b7e3c4473c29456c492d6f08a93e37f4/f6eae63ebbc500de6e7310fc6568df4e6a4514aac0d3d423da5e4e3f332d04f5/g' contracts/libraries/XYZSwapLibrary.sol
