#!/bin/sh

while getopts "f:" arg; do
  case $arg in
    f) FILE=$OPTARG;;
  esac
done

# because compile with coverage will change the bytecode of xyzswap pair so we must replace them
sed -i '.original' -e 's/558d6bb1d967c75474673a2c4379bbb0dc78edb48b55f1d00667922b25b0332d/77854f5a617e57b8e054e9182dc8db4ec59affc0e15be0e89996f71c0f9f68aa/g' contracts/libraries/XYZSwapLibrary.sol
if [ -n "$FILE" ]
then
    yarn hardhat coverage --testfiles $FILE
else
    yarn hardhat coverage
fi
sed -i '.original' -e 's/77854f5a617e57b8e054e9182dc8db4ec59affc0e15be0e89996f71c0f9f68aa/558d6bb1d967c75474673a2c4379bbb0dc78edb48b55f1d00667922b25b0332d/g' contracts/libraries/XYZSwapLibrary.sol
