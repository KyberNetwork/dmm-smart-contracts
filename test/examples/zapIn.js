const {MaxUint256} = require('@ethersproject/constants');
const {artifacts, contract} = require('hardhat');
const Helper = require('./../helper');
const BN = web3.utils.BN;

const {expectEvent} = require('@openzeppelin/test-helpers');

const ZapIn = artifacts.require('ZapIn');
const DMMRouter = artifacts.require('DMMRouter02');
const DMMPool = artifacts.require('DMMPool');
const DMMFactory = artifacts.require('DMMFactory');
const WETH = artifacts.require('WETH9');
const TestToken = artifacts.require('TestToken');

contract('ZapIn', accounts => {
  let token;
  let weth;
  let zapIn;
  let pool;
  let token0Addr;
  beforeEach('basic setup', async () => {
    token = await TestToken.new('tst', 'A', Helper.expandTo18Decimals(10000));
    weth = await WETH.new();

    let factory = await DMMFactory.new(accounts[0]);
    let router = await DMMRouter.new(factory.address, weth.address);
    // set up pool with 100 token and 30 eth
    await token.approve(router.address, Helper.MaxUint256);
    await router.addLiquidityNewPoolETH(
      token.address,
      new BN(15000),
      Helper.precisionUnits.mul(new BN(100)),
      new BN(0),
      new BN(0),
      accounts[0],
      Helper.MaxUint256,
      {
        value: Helper.expandTo18Decimals(30)
      }
    );
    poolAddress = (await factory.getPools(token.address, weth.address))[0];
    pool = await DMMPool.at(poolAddress);
    token0Addr = await pool.token0();
    // swap to change the ratio of the pool a bit
    await router.swapExactETHForTokens(
      new BN(0),
      [poolAddress],
      [weth.address, token.address],
      accounts[0],
      Helper.MaxUint256,
      {value: Helper.expandTo18Decimals(7)}
    );
    zapIn = await ZapIn.new(factory.address, weth.address);
  });

  it('#zapIn', async () => {
    await token.approve(zapIn.address, Helper.MaxUint256, {from: accounts[1]});
    let userIn = Helper.expandTo18Decimals(5);
    await token.transfer(accounts[1], userIn);

    let swapAmounts = await zapIn.calculateSwapAmounts(token.address, weth.address, pool.address, userIn);
    let result = await zapIn.zapIn(token.address, weth.address, userIn, pool.address, 1, MaxUint256, {
      from: accounts[1]
    });

    expectEvent.inTransaction(result.tx, pool, 'Swap', {
      amount0In: token0Addr === token.address ? swapAmounts[0] : new BN(0),
      amount1In: token0Addr === token.address ? new BN(0) : swapAmounts[0],
      amount0Out: token0Addr === token.address ? new BN(0) : swapAmounts[1],
      amount1Out: token0Addr === token.address ? swapAmounts[1] : new BN(0)
    });
  });

  it('#zapInEth', async () => {
    let userIn = Helper.expandTo18Decimals(3);
    await zapIn.zapInEth(token.address, pool.address, 1, MaxUint256, {from: accounts[1], value: userIn});
    Helper.assertGreater(await pool.balanceOf(accounts[1]), new BN(0));
  });

  it('#zapOut', async () => {
    let userIn = Helper.expandTo18Decimals(3);
    await zapIn.zapInEth(token.address, pool.address, 1, MaxUint256, {from: accounts[1], value: userIn});

    await pool.approve(zapIn.address, MaxUint256, {from: accounts[1]});

    let liquidity = await pool.balanceOf(accounts[1]);
    await zapIn.zapOutEth(token.address, liquidity, pool.address, accounts[1], 1, MaxUint256, {from: accounts[1]});
  });
});
