const TestToken = artifacts.require('TestToken');
const AmplificationPair = artifacts.require('AmplificationPair');
const AmplificationFactory = artifacts.require('AmplificationFactory');

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
    const amountOut = getAmountOut(expandTo18Decimals(200), expandTo18Decimals(2), amountIn);

    await token1.transfer(pair.address, amountIn);
    await expectRevert(pair.swap(amountOut.add(new BN(1)), new BN(0), user, '0x'), 'UniswapV2: K');

    let txResult = await pair.swap(amountOut, new BN(0), user, '0x');
    await expectEvent(txResult, 'Swap');

    await logBalance(pair.address);
    let reserves = await pair.getReserves();
    console.log(reserves._realReserve0.toString(), reserves._realReserve1.toString());

    const burnAmount = expectTotalSuppy.sub(new BN(1000));
    await pair.transfer(pair.address, burnAmount, {from: lpUser});

    await pair.burn(lpUser);
    await logBalance(lpUser);
  });
});

async function logBalance (user) {
  console.log(`token0: ${(await token0.balanceOf(user)).toString()}`);
  console.log(`token1: ${(await token1.balanceOf(user)).toString()}`);
}

function getAmountOut (reserveIn, reserveOut, amountIn) {
  let amountInWithFee = amountIn.mul(new BN(997));
  let numerator = amountInWithFee.mul(reserveOut);
  let denominator = reserveIn.mul(new BN(1000)).add(amountInWithFee);
  return numerator.div(denominator);
}
