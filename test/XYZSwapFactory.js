const TestToken = artifacts.require('TestToken');
const XYZSwapFactory = artifacts.require('XYZSwapFactory');
const XYZSwapPair = artifacts.require('XYZSwapPair');

const Helper = require('./helper');

const {expectEvent, expectRevert, constants} = require('@openzeppelin/test-helpers');
const {assert} = require('chai');
const BN = web3.utils.BN;

const MINIMUM_LIQUIDITY = new BN(1000);

let tokenA;
let tokenB;
let factory;
let pair;
let feeToSetter;
let feeTo;
let liquidityProvider;
let app;

contract('XYZSwapFactory', function (accounts) {
  before('init', async () => {
    feeToSetter = accounts[1];
    feeTo = accounts[2];
    factory = await XYZSwapFactory.new(feeToSetter);

    tokenA = await TestToken.new('test token A', 'A', Helper.expandTo18Decimals(10000));
    tokenB = await TestToken.new('test token B', 'B', Helper.expandTo18Decimals(10000));
  });

  it('create pair', async () => {
    await expectRevert(factory.createPair(tokenA.address, constants.ZERO_ADDRESS), 'XYZSwap: ZERO_ADDRESS');

    await expectRevert(factory.createPair(tokenA.address, tokenA.address), 'XYZSwap: IDENTICAL_ADDRESSES');

    await factory.createPair(tokenA.address, tokenB.address);
    await expectRevert(factory.createPair(tokenA.address, tokenB.address), 'XYZSwap: PAIR_EXISTS');

    Helper.assertEqual(await factory.allPairsLength(), 1);
  });

  it('set FeeTo', async () => {
    await expectRevert(factory.setFeeTo(feeTo), 'XYZSwap: FORBIDDEN');
    await factory.setFeeTo(feeTo, {from: feeToSetter});
  });

  it('set feeToSetter', async () => {
    let newFeeToSetter = accounts[3];
    await expectRevert(factory.setFeeToSetter(newFeeToSetter), 'XYZSwap: FORBIDDEN');
    await factory.setFeeToSetter(newFeeToSetter, {from: feeToSetter});

    assert((await factory.feeToSetter()) == newFeeToSetter, 'unexpected feeToSetter');
  });
});
