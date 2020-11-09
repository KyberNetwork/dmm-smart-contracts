#!/bin/sh
# because compile with coverage will change the bytecode of uniswap pair so we must replace them
sed -i '.original' -e 's/fc30a99a4d0dfe8ca6408b799de8ab095334666ccc688012f32d6bc4a4a83181/49c4aa6629387be085791973c5ba7c8335fbf3b1b5b4adfe5a5a0b1baad5b4a4/g' contracts/libraries/XYZSwapLibrary.sol
yarn buidler coverage
sed -i '.original' -e 's/49c4aa6629387be085791973c5ba7c8335fbf3b1b5b4adfe5a5a0b1baad5b4a4/fc30a99a4d0dfe8ca6408b799de8ab095334666ccc688012f32d6bc4a4a83181/g' contracts/libraries/XYZSwapLibrary.sol
