const TestToken = artifacts.require('TestToken');
const AmplificationPair = artifacts.require('AmplificationPair');
const AmplificationFactory = artifacts.require('AmplificationFactory');
const AmplificationRounter02 = artifacts.require('AmplificationRouter02');

const {expectEvent, expectRevert, constants} = require('@openzeppelin/test-helpers');
const {assert} = require('chai');
const BN = web3.utils.BN;

const Helper = require('./helper');
const {expandTo18Decimals, precisionUnits} = require('./helper');

let pair;
let factory;
let user;
let lpUser;
let admin;
let router;

let token0;
let token1;

contract('AmplificationPair', accounts => {
  it('test', async () => {
    admin = accounts[1];
    lpUser = accounts[2];
    user = accounts[3];

    let factory = await AmplificationFactory.new(admin);
    let tokenA = await TestToken.new('test token A', 'A', Helper.expandTo18Decimals(10000));
    let tokenB = await TestToken.new('test token B', 'B', Helper.expandTo18Decimals(10000));

    await factory.createPair(tokenA.address, tokenB.address, new BN(20000));
    const pairAddr = await factory.getPair(tokenA.address, tokenB.address);
    const pair = await AmplificationPair.at(pairAddr);

    const token0Address = await pair.token0();
    token0 = tokenA.address === token0Address ? tokenA : tokenB;
    token1 = tokenA.address === token0Address ? tokenB : tokenA;

    await token0.transfer(pair.address, expandTo18Decimals(1));
    await token1.transfer(pair.address, expandTo18Decimals(100));

    await pair.mint(lpUser);
    const expectTotalSuppy = expandTo18Decimals(20);
    Helper.assertEqual(await pair.totalSupply(), expectTotalSuppy);
    Helper.assertEqual(await pair.balanceOf(lpUser), expectTotalSuppy.sub(new BN(1000)));

    const amountIn = expandTo18Decimals(20);

    let tradeInfo = await pair.getTradeInfo();
    const amountOut = getAmountOut(expandTo18Decimals(200), expandTo18Decimals(2), amountIn, tradeInfo.feeInPrecision);

    await token1.transfer(pair.address, amountIn);
    await expectRevert(pair.swap(amountOut.add(new BN(1)), new BN(0), user, '0x'), 'XYZSwap: K');

    console.log('-- swap --');
    await logPairInfo(pair);

    let txResult = await pair.swap(amountOut, new BN(0), user, '0x');
    await expectEvent(txResult, 'Swap');

    console.log('-- burn --');
    await logPairInfo(pair);

    const burnAmount = expectTotalSuppy.sub(new BN(1000));
    await pair.transfer(pair.address, burnAmount, {from: lpUser});
    await pair.burn(lpUser);
    await logBalance(lpUser);

    router = await AmplificationRounter02.new(constants.ZERO_ADDRESS, constants.ZERO_ADDRESS);
    await token0.approve(router.address, Helper.MaxUint256);
    await token1.approve(router.address, Helper.MaxUint256);

    console.log('-- add liquidity with router --');
    await logPairInfo(pair);
    await router.addLiquidity(
      token1.address,
      token0.address,
      pair.address,
      expandTo18Decimals(100),
      expandTo18Decimals(1),
      new BN(0),
      new BN(0),
      lpUser,
      Helper.MaxUint256
    );

    console.log(' -- swap with router --');
    await logPairInfo(pair);

    // await router.swapExactTokensForTokens(
    //   expandTo18Decimals(1),
    //   new BN(0),
    //   [pair.address],
    //   [token1.address, token0.address],
    //   user,
    //   Helper.MaxUint256
    // );
    // await logPairInfo(pair);

    await router.swapExactTokensForTokens(
      expandTo18Decimals(1),
      new BN(0),
      [pair.address],
      [token0.address, token1.address],
      user,
      Helper.MaxUint256
    );
    await logPairInfo(pair);
  });
});

async function logPairInfo (pair) {
  let tradeInfo = await pair.getTradeInfo();
  console.log(`rReserve0 = ${tradeInfo._rReserve0.toString()} rReserve1=${tradeInfo._rReserve1.toString()}`);
  console.log(`vReserve0 = ${tradeInfo._vReserve0.toString()} vReserve1=${tradeInfo._vReserve1.toString()}`);
  let [minRate, maxRate] = getPriceRange(tradeInfo);
  console.log(`price range [${minRate}, ${maxRate}]`);
}

// get price range of token1 / token0
function getPriceRange (tradeInfo) {
  let maxRate;
  if (tradeInfo._rReserve0.eq(tradeInfo._vReserve0)) {
    maxRate = Infinity;
  } else {
    let limVReserve0 = tradeInfo._vReserve0.sub(tradeInfo._rReserve0);
    let limVReserve1 = tradeInfo._vReserve1.mul(tradeInfo._vReserve0).div(limVReserve0);
    maxRate = limVReserve1.mul(Helper.precisionUnits).div(limVReserve0);
  }

  let minRate;
  if (tradeInfo._rReserve1.eq(tradeInfo._vReserve1)) {
    minRate = new BN(0);
  } else {
    let limVReserve1 = tradeInfo._vReserve1.sub(tradeInfo._rReserve1);
    let limVReserve0 = tradeInfo._vReserve1.mul(tradeInfo._vReserve0).div(limVReserve1);
    minRate = limVReserve1.mul(Helper.precisionUnits).div(limVReserve0);
  }
  return [minRate, maxRate];
}

async function logBalance (user) {
  console.log(`token0: ${(await token0.balanceOf(user)).toString()}`);
  console.log(`token1: ${(await token1.balanceOf(user)).toString()}`);
}

function getAmountOut (reserveIn, reserveOut, amountIn, feeInPrecision) {
  let amountInWithFee = amountIn.mul(Helper.precisionUnits.sub(feeInPrecision)).div(Helper.precisionUnits);
  let numerator = amountInWithFee.mul(reserveOut);
  let denominator = reserveIn.add(amountInWithFee);
  return numerator.div(denominator);
}
