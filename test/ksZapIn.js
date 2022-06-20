const {artifacts, contract} = require('hardhat');
const Helper = require('./helper');
const {MaxUint256} = require('./helper');
const BN = web3.utils.BN;
const {ecsign} = require('ethereumjs-util');

const {expectEvent} = require('@openzeppelin/test-helpers');

const KSZapIn = artifacts.require('KSZapIn');
const KSRouter = artifacts.require('KSRouter02');
const KSPool = artifacts.require('KSPool');
const KSFactory = artifacts.require('KSFactory');
const WETH = artifacts.require('WETH9');
const TestToken = artifacts.require('TestToken');

contract('KSZapIn', accounts => {
  let factory;
  let token;
  let weth;
  let ksZapIn;
  let pool;
  let token0Addr;

  let ampBpsArr = [10000, 15000];
  ampBpsArr.forEach(ampBps => {
    describe(`ampBps = ${ampBps}`, async () => {
      beforeEach('basic setup', async () => {
        token = await TestToken.new('tst', 'A', Helper.expandTo18Decimals(10000));
        weth = await WETH.new();

        factory = await KSFactory.new(accounts[0]);
        await factory.setFeeConfiguration(accounts[1], new BN(10000));

        let router = await KSRouter.new(factory.address, weth.address);
        // set up pool with 100 token and 30 eth
        await token.approve(router.address, MaxUint256);
        await router.addLiquidityNewPoolETH(
          token.address,
          [new BN(ampBps), new BN(10)],
          Helper.precisionUnits.mul(new BN(100)),
          new BN(0),
          new BN(0),
          accounts[0],
          MaxUint256,
          {
            value: Helper.expandTo18Decimals(30)
          }
        );
        poolAddress = (await factory.getPools(token.address, weth.address))[0];
        pool = await KSPool.at(poolAddress);
        token0Addr = await pool.token0();
        // swap to change the ratio of the pool a bit
        await router.swapExactETHForTokens(
          new BN(0),
          [poolAddress],
          [weth.address, token.address],
          accounts[0],
          MaxUint256,
          {value: Helper.expandTo18Decimals(7)}
        );
        ksZapIn = await KSZapIn.new(weth.address);
      });

      it('#zapIn', async () => {
        await token.approve(ksZapIn.address, MaxUint256, {from: accounts[1]});
        let userIn = Helper.expandTo18Decimals(5);
        await token.transfer(accounts[1], userIn);

        let swapAmounts = await ksZapIn.calculateSwapAmounts(factory.address, token.address, weth.address, pool.address, userIn);
        let result = await ksZapIn.zapIn(factory.address, token.address, weth.address, userIn, pool.address, accounts[1], 1, MaxUint256, {
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
        await ksZapIn.zapInEth(factory.address, token.address, pool.address, accounts[1], 1, MaxUint256, {
          from: accounts[1],
          value: userIn
        });
        Helper.assertGreater(await pool.balanceOf(accounts[1]), new BN(0));
      });

      it('#zapOut', async () => {
        let userIn = Helper.expandTo18Decimals(3);
        await ksZapIn.zapInEth(factory.address, token.address, pool.address, accounts[1], 1, MaxUint256, {
          from: accounts[1],
          value: userIn
        });

        await pool.approve(ksZapIn.address, MaxUint256, {from: accounts[1]});

        let liquidity = await pool.balanceOf(accounts[1]);

        let zapOutAmount = await ksZapIn.calculateZapOutAmount(factory.address, token.address, weth.address, pool.address, liquidity);

        let beforeBalance = await Helper.getBalancePromise(accounts[1]);
        await ksZapIn.zapOutEth(factory.address, token.address, liquidity, pool.address, accounts[1], 1, MaxUint256, {
          from: accounts[1],
          gasPrice: new BN(0)
        });
        let afterBalance = await Helper.getBalancePromise(accounts[1]);
        Helper.assertEqual(afterBalance.sub(beforeBalance), zapOutAmount, 'unexpected zapOut amout');
      });

      it('#zapOutPermit', async () => {
        const liquidityProvider = accounts[3];
        // key from hardhat.config.js
        const liquidityProviderPrvKey = '0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131';

        let userIn = Helper.expandTo18Decimals(3);
        await ksZapIn.zapInEth(factory.address, token.address, pool.address, liquidityProvider, 1, MaxUint256, {
          from: liquidityProvider,
          value: userIn
        });

        const liquidity = await pool.balanceOf(liquidityProvider);

        const nonce = await pool.nonces(liquidityProvider);
        const digest = await Helper.getApprovalDigest(
          pool,
          liquidityProvider,
          ksZapIn.address,
          liquidity,
          nonce,
          MaxUint256
        );
        const {v, r, s} = ecsign(
          Buffer.from(digest.slice(2), 'hex'),
          Buffer.from(liquidityProviderPrvKey.slice(2), 'hex')
        );

        await ksZapIn.zapOutPermit(
          factory.address,
          token.address,
          weth.address,
          liquidity,
          pool.address,
          accounts[1],
          1,
          MaxUint256,
          false,
          v,
          r,
          s,
          {
            from: liquidityProvider
          }
        );
      });

      it('#zapOut with permit', async () => {
        const liquidityProvider = accounts[3];
        // key from hardhat.config.js
        const liquidityProviderPrvKey = '0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131';

        let userIn = Helper.expandTo18Decimals(3);
        await ksZapIn.zapInEth(factory.address, token.address, pool.address, liquidityProvider, 1, MaxUint256, {
          from: liquidityProvider,
          value: userIn
        });

        const liquidity = await pool.balanceOf(liquidityProvider);

        const nonce = await pool.nonces(liquidityProvider);
        const digest = await Helper.getApprovalDigest(
          pool,
          liquidityProvider,
          ksZapIn.address,
          liquidity,
          nonce,
          MaxUint256
        );
        const {v, r, s} = ecsign(
          Buffer.from(digest.slice(2), 'hex'),
          Buffer.from(liquidityProviderPrvKey.slice(2), 'hex')
        );

        await ksZapIn.zapOutEthPermit(
          factory.address,
          token.address,
          liquidity,
          pool.address,
          accounts[1],
          1,
          MaxUint256,
          false,
          v,
          r,
          s,
          {
            from: liquidityProvider
          }
        );
      });
    });
  });
});
