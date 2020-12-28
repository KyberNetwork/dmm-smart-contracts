const BN = web3.utils.BN;
const Helper = require('./helper');

module.exports.getAmountOut = async (amountIn, tokenIn, pair) => {
  let token0Addr = await pair.token0();
  let tradeInfo = await pair.getTradeInfo();
  let reserveIn = token0Addr == tokenIn.address ? tradeInfo._vReserve0 : tradeInfo._vReserve1;
  let reserveOut = token0Addr == tokenIn.address ? tradeInfo._vReserve1 : tradeInfo._vReserve0;

  let amountInWithFee = amountIn.mul(Helper.precisionUnits.sub(tradeInfo.feeInPrecision)).div(Helper.precisionUnits);
  let numerator = reserveIn.mul(reserveOut);
  let denominator = reserveIn.add(amountInWithFee);
  return reserveOut.sub(numerator.add(denominator.sub(new BN(1))).div(denominator));
};

module.exports.getFee = (totalSuppy, k, kLast) => {
  const rootK = Helper.sqrt(k);
  const rootKLast = Helper.sqrt(kLast);
  return totalSuppy.mul(rootK.sub(rootKLast)).div(rootK.mul(new BN(5)).add(rootKLast));
};
