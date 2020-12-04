#!/bin/sh
# because compile with coverage will change the bytecode of xyzswap pair so we must replace them
sed -i '.original' -e 's/1fbf890e3383ea20f3a8975d705f6eb233790bdda3640212fa992b1ae4a8adc4/4c0d03e56a7e1c6b88445a539ac93fc4dc57e5b7ee92485439311f6f59101a07/g' contracts/libraries/XYZSwapLibrary.sol
yarn hardhat coverage
sed -i '.original' -e 's/4c0d03e56a7e1c6b88445a539ac93fc4dc57e5b7ee92485439311f6f59101a07/1fbf890e3383ea20f3a8975d705f6eb233790bdda3640212fa992b1ae4a8adc4/g' contracts/libraries/XYZSwapLibrary.sol
