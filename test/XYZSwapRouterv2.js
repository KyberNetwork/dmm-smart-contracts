const Helper = require('./helper');
const BN = web3.utils.BN;
const {MaxUint256, ethAddress, expandTo18Decimals} = require('./helper');

const XYZSwapFactory = artifacts.require('XYZSwapFactory');
const XYZSwapPair = artifacts.require('XYZSwapPair');
const FeeToken = artifacts.require('MockFeeOnTransferERC20');
const XYZSwapRouterv2 = artifacts.require('XYZSwapRouterv2');

let feeToken;

let factory;
let pair;
let router;

let feeSetter;
let liquidityProvider;

contract('XYZSwapRouterv2', accounts => {
  before('set accounts', async () => {
    feeSetter = accounts[0];
    liquidityProvider = accounts[1];
    trader = accounts[2];
  });

  beforeEach(' setup factory and router', async () => {
    feeToken = await FeeToken.new('feeOnTransfer Token', 'FOT', expandTo18Decimals(100000));

    factory = await XYZSwapFactory.new(feeSetter);
    router = await XYZSwapRouterv2.new(factory.address);
    // make a DTT<>WETH pair
    await factory.createPair(feeToken.address, ethAddress);
    const pairAddress = await factory.getPair(feeToken.address, ethAddress);
    pair = await XYZSwapPair.at(pairAddress);
  });

  afterEach(async function () {
    Helper.assertEqual(await Helper.getBalancePromise(router.address), new BN(0));
  });

  async function addLiquidity (feeTokenAmount, ethAmount, liquidityProvider) {
    await feeToken.approve(router.address, MaxUint256);
    await router.addLiquidityETH(
      feeToken.address,
      feeTokenAmount,
      feeTokenAmount,
      ethAmount,
      liquidityProvider,
      MaxUint256,
      {
        value: ethAmount
      }
    );
  }

  it('removeLiquidityETHSupportingFeeOnTransferTokens', async () => {
    let feeTokenAmount = expandTo18Decimals(1);
    let ethAmount = expandTo18Decimals(4);
    await addLiquidity(feeTokenAmount, ethAmount, liquidityProvider);
    feeTokenAmount = await feeToken.balanceOf(pair.address);

    const liquidity = await pair.balanceOf(liquidityProvider);
    const totalSupply = await pair.totalSupply();
    const feeTokenExpected = feeTokenAmount.mul(liquidity).div(totalSupply);
    const ethExpected = ethAmount.mul(liquidity).div(totalSupply);

    await pair.approve(router.address, MaxUint256, {from: liquidityProvider});
    await router.removeLiquidityETHSupportingFeeOnTransferTokens(
      feeToken.address,
      liquidity,
      feeTokenExpected,
      ethExpected,
      liquidityProvider,
      MaxUint256,
      {
        from: liquidityProvider
      }
    );
  });

  // ETH -> DTT
  it('swapExactETHForTokensSupportingFeeOnTransferTokens', async () => {
    const feeTokenAmount = expandTo18Decimals(10)
      .mul(new BN(100))
      .div(new BN(99));
    const ethAmount = expandTo18Decimals(5);
    const swapAmount = expandTo18Decimals(1);
    await addLiquidity(feeTokenAmount, ethAmount, liquidityProvider);

    await feeToken.transfer(trader, swapAmount.mul(new BN(2)));
    // await feeToken.approve(router.address, MaxUint256, {from: trader});
    await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      0,
      [ethAddress, feeToken.address],
      trader,
      MaxUint256,
      {
        from: trader,
        value: swapAmount
      }
    );
  });

  // DTT -> ETH
  it('swapExactTokensForETHSupportingFeeOnTransferTokens', async () => {
    const feeTokenAmount = expandTo18Decimals(5)
      .mul(new BN(100))
      .div(new BN(99));
    const ethAmount = expandTo18Decimals(10);
    const swapAmount = expandTo18Decimals(1);
    await addLiquidity(feeTokenAmount, ethAmount, liquidityProvider);

    await feeToken.transfer(trader, swapAmount.mul(new BN(2)));
    await feeToken.approve(router.address, MaxUint256, {from: trader});
    await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      swapAmount,
      0,
      [feeToken.address, ethAddress],
      trader,
      MaxUint256,
      {
        from: trader
      }
    );
  });

  it('swapExactTokensForTokensSupportingFeeOnTransferTokens', async () => {
    const feeToken2 = await FeeToken.new('feeOnTransfer Token2', 'FOT2', expandTo18Decimals(100000));

    const feeTokenAmount = expandTo18Decimals(5)
      .mul(new BN(100))
      .div(new BN(99));
    const feeTokenAmount2 = expandTo18Decimals(5);
    const amountIn = expandTo18Decimals(1);

    await feeToken.approve(router.address, MaxUint256);
    await feeToken2.approve(router.address, MaxUint256);
    await router.addLiquidity(
      feeToken.address,
      feeToken2.address,
      feeTokenAmount,
      feeTokenAmount2,
      feeTokenAmount,
      feeTokenAmount2,
      liquidityProvider,
      MaxUint256
    );

    await feeToken.approve(router.address, MaxUint256, {from: trader});
    await feeToken.transfer(trader, amountIn.mul(new BN(2)));

    await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      amountIn,
      0,
      [feeToken.address, feeToken2.address],
      trader,
      MaxUint256,
      {from: trader}
    );
  });

  /*
  it('removeLiquidityETHWithPermitSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = expandTo18Decimals(1)
      .mul(100)
      .div(99);
    const ETHAmount = expandTo18Decimals(4);
    await addLiquidity(DTTAmount, ETHAmount);

    const expectedLiquidity = expandTo18Decimals(2);

    const nonce = await pair.nonces(wallet.address);
    const digest = await getApprovalDigest(
      pair,
      {owner: wallet.address, spender: router.address, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY)},
      nonce,
      MaxUint256
    );
    const {v, r, s} = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'));

    const DTTInPair = await DTT.balanceOf(pair.address);
    const WETHInPair = await WETH.balanceOf(pair.address);
    const liquidity = await pair.balanceOf(wallet.address);
    const totalSupply = await pair.totalSupply();
    const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply);
    const WETHExpected = WETHInPair.mul(liquidity).div(totalSupply);

    await pair.approve(router.address, MaxUint256);
    await router.removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
      DTT.address,
      liquidity,
      NaiveDTTExpected,
      WETHExpected,
      wallet.address,
      MaxUint256,
      false,
      v,
      r,
      s,
      overrides
    );
  });
  */
});
