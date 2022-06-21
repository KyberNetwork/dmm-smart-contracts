const {artifacts, contract} = require('hardhat');
const Helper = require('../helper');
const {MaxUint256} = require('../helper');
const BN = web3.utils.BN;
const {ecsign} = require('ethereumjs-util');

const {expectEvent, expectRevert} = require('@openzeppelin/test-helpers');

const KSZap = artifacts.require('KSZap');
const KSRouter = artifacts.require('KSRouter02');
const KSPool = artifacts.require('KSPool');
const KSFactory = artifacts.require('KSFactory');
const WETH = artifacts.require('WETH9');
const TestToken = artifacts.require('TestToken');

contract('KSZap', (accounts) => {
  let factory;
  let newFactory;
  let token;
  let weth;
  let ksZap;
  let pool;
  let token0Addr;
  let router;

  let ampBpsArr = [10000, 15000];
  ampBpsArr.forEach((ampBps) => {
    describe(`ampBps = ${ampBps}`, async () => {
      beforeEach('basic setup', async () => {
        token = await TestToken.new('tst', 'A', Helper.expandTo18Decimals(10000));
        weth = await WETH.new();

        factory = await KSFactory.new(accounts[0]);
        await factory.setFeeConfiguration(accounts[1], new BN(10000));
        // for whitelisted factory test
        newFactory = await KSFactory.new(accounts[0]);

        router = await KSRouter.new(factory.address, weth.address);
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
            value: Helper.expandTo18Decimals(30),
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
        ksZap = await KSZap.new(factory.address, weth.address);
      });

      it('#initialize', async () => {
        Helper.assertEqual(await ksZap.configMaster(), accounts[0], 'unexpected configMaster');
        Helper.assertEqual(await ksZap.whitelistedFactories(factory.address), true, 'unexpected factory');
      });

      it('#update config master', async () => {
        const updateConfigMasterTx = await ksZap.updateConfigMaster(accounts[1], {
          from: accounts[0],
        });

        expectEvent.inTransaction(updateConfigMasterTx.tx, ksZap, 'ConfigMasterUpdated', {
          newConfigMaster: accounts[1],
        });
      });

      it('#not allow to update config master', async () => {
        await expectRevert(
          ksZap.updateConfigMaster(accounts[1], {
            from: accounts[1],
          }),
          'KSZap: Forbidden'
        );
      });

      it('#add whitelist factory', async () => {
        const addWhitelistFactoryTx = await ksZap.addFactory(newFactory.address, {
          from: accounts[0],
        });

        expectEvent.inTransaction(addWhitelistFactoryTx.tx, ksZap, 'FactoryAdded', {
          factory: newFactory.address,
        });
      });

      it('#remove whitelist factory', async () => {
        const removeWhitelistFactoryTx = await ksZap.removeFactory(newFactory.address, {
          from: accounts[0],
        });

        expectEvent.inTransaction(removeWhitelistFactoryTx.tx, ksZap, 'FactoryRemoved', {
          factory: newFactory.address,
        });
      });

      it('#not allow to add or remove factory', async () => {
        await expectRevert(
          ksZap.addFactory(newFactory.address, {
            from: accounts[1],
          }),
          'KSZap: Forbidden'
        );

        await expectRevert(
          ksZap.removeFactory(newFactory.address, {
            from: accounts[1],
          }),
          'KSZap: Forbidden'
        );
      });

      it('#zapIn', async () => {
        await token.approve(ksZap.address, MaxUint256, {from: accounts[1]});
        let userIn = Helper.expandTo18Decimals(5);
        await token.transfer(accounts[1], userIn);

        let swapAmounts = await ksZap.calculateSwapAmounts(
          factory.address,
          token.address,
          weth.address,
          pool.address,
          userIn
        );
        let result = await ksZap.zapIn(
          factory.address,
          token.address,
          weth.address,
          userIn,
          pool.address,
          accounts[1],
          1,
          MaxUint256,
          {
            from: accounts[1],
          }
        );

        expectEvent.inTransaction(result.tx, pool, 'Swap', {
          amount0In: token0Addr === token.address ? swapAmounts[0] : new BN(0),
          amount1In: token0Addr === token.address ? new BN(0) : swapAmounts[0],
          amount0Out: token0Addr === token.address ? new BN(0) : swapAmounts[1],
          amount1Out: token0Addr === token.address ? swapAmounts[1] : new BN(0),
        });
      });

      it('#zapIn wrong factory', async () => {
        await token.approve(ksZap.address, MaxUint256, {from: accounts[1]});
        let userIn = Helper.expandTo18Decimals(5);
        await token.transfer(accounts[1], userIn);

        await expectRevert(
          ksZap.zapIn(
            newFactory.address,
            token.address,
            weth.address,
            userIn,
            pool.address,
            accounts[1],
            1,
            MaxUint256,
            {
              from: accounts[1],
            }
          ),
          'KSZap: Forbidden'
        );
      });

      it('#zapInEth', async () => {
        let userIn = Helper.expandTo18Decimals(3);
        await ksZap.zapInEth(factory.address, token.address, pool.address, accounts[1], 1, MaxUint256, {
          from: accounts[1],
          value: userIn,
        });
        Helper.assertGreater(await pool.balanceOf(accounts[1]), new BN(0));
      });

      it('#zapInEth wrong factory', async () => {
        let userIn = Helper.expandTo18Decimals(3);
        await expectRevert(
          ksZap.zapInEth(newFactory.address, token.address, pool.address, accounts[1], 1, MaxUint256, {
            from: accounts[1],
            value: userIn,
          }),
          'KSZap: Forbidden'
        );
      });

      it('#calculateZapOutAmount', async () => {
        const tokenA = await TestToken.new('tstA', 'B', Helper.expandTo18Decimals(10000));
        const tokenB = await TestToken.new('tstB', 'B', Helper.expandTo18Decimals(10000));

        // set up new pool with 100 tokenA and 100 tokenB
        await tokenA.approve(router.address, MaxUint256);
        await tokenB.approve(router.address, MaxUint256);

        await router.addLiquidityNewPool(
          tokenA.address,
          tokenB.address,
          [new BN(ampBps), new BN(10)],
          Helper.precisionUnits.mul(new BN(100)),
          Helper.precisionUnits.mul(new BN(100)),
          new BN(0),
          new BN(0),
          accounts[0],
          MaxUint256
        );
        poolAddress = (await factory.getPools(tokenA.address, tokenB.address))[0];
        liquidity = Helper.expandTo18Decimals(3);

        let zapOutAmountToken0 = await ksZap.calculateZapOutAmount(
          factory.address,
          tokenA.address,
          tokenB.address,
          poolAddress,
          liquidity
        );

        let zapOutAmountToken1 = await ksZap.calculateZapOutAmount(
          factory.address,
          tokenB.address,
          tokenA.address,
          poolAddress,
          liquidity
        );

        Helper.assertEqual(
          zapOutAmountToken0,
          zapOutAmountToken1,
          'unexpected zapOut amount between tokenIn is token0 or token1'
        );
      });

      it('#zapOut', async () => {
        let userIn = Helper.expandTo18Decimals(3);
        await ksZap.zapInEth(factory.address, token.address, pool.address, accounts[1], 1, MaxUint256, {
          from: accounts[1],
          value: userIn,
        });

        await pool.approve(ksZap.address, MaxUint256, {from: accounts[1]});

        let liquidity = await pool.balanceOf(accounts[1]);

        let zapOutAmount = await ksZap.calculateZapOutAmount(
          factory.address,
          token.address,
          weth.address,
          pool.address,
          liquidity
        );

        let beforeBalance = await Helper.getBalancePromise(accounts[1]);
        await ksZap.zapOutEth(factory.address, token.address, liquidity, pool.address, accounts[1], 1, MaxUint256, {
          from: accounts[1],
          gasPrice: new BN(0),
        });
        let afterBalance = await Helper.getBalancePromise(accounts[1]);
        Helper.assertEqual(afterBalance.sub(beforeBalance), zapOutAmount, 'unexpected zapOut amout');
      });

      it('#zapOut wrong factory', async () => {
        let userIn = Helper.expandTo18Decimals(3);
        await ksZap.zapInEth(factory.address, token.address, pool.address, accounts[1], 1, MaxUint256, {
          from: accounts[1],
          value: userIn,
        });

        await pool.approve(ksZap.address, MaxUint256, {from: accounts[1]});

        let liquidity = await pool.balanceOf(accounts[1]);

        await expectRevert(
          ksZap.zapOutEth(newFactory.address, token.address, liquidity, pool.address, accounts[1], 1, MaxUint256, {
            from: accounts[1],
            gasPrice: new BN(0),
          }),
          'KSZap: Forbidden'
        );
      });

      it('#zapOutPermit', async () => {
        const liquidityProvider = accounts[3];
        // key from hardhat.config.js
        const liquidityProviderPrvKey = '0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131';

        let userIn = Helper.expandTo18Decimals(3);
        await ksZap.zapInEth(factory.address, token.address, pool.address, liquidityProvider, 1, MaxUint256, {
          from: liquidityProvider,
          value: userIn,
        });

        const liquidity = await pool.balanceOf(liquidityProvider);

        const nonce = await pool.nonces(liquidityProvider);
        const digest = await Helper.getApprovalDigest(
          pool,
          liquidityProvider,
          ksZap.address,
          liquidity,
          nonce,
          MaxUint256
        );
        const {v, r, s} = ecsign(
          Buffer.from(digest.slice(2), 'hex'),
          Buffer.from(liquidityProviderPrvKey.slice(2), 'hex')
        );

        await ksZap.zapOutPermit(
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
            from: liquidityProvider,
          }
        );
      });

      it('#zapOutPermit wrong factory', async () => {
        const liquidityProvider = accounts[3];
        // key from hardhat.config.js
        const liquidityProviderPrvKey = '0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131';

        let userIn = Helper.expandTo18Decimals(3);
        await ksZap.zapInEth(factory.address, token.address, pool.address, liquidityProvider, 1, MaxUint256, {
          from: liquidityProvider,
          value: userIn,
        });

        const liquidity = await pool.balanceOf(liquidityProvider);

        const nonce = await pool.nonces(liquidityProvider);
        const digest = await Helper.getApprovalDigest(
          pool,
          liquidityProvider,
          ksZap.address,
          liquidity,
          nonce,
          MaxUint256
        );
        const {v, r, s} = ecsign(
          Buffer.from(digest.slice(2), 'hex'),
          Buffer.from(liquidityProviderPrvKey.slice(2), 'hex')
        );

        await expectRevert(
          ksZap.zapOutPermit(
            newFactory.address,
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
              from: liquidityProvider,
            }
          ),
          'KSZap: Forbidden'
        );
      });

      it('#zapOut with permit', async () => {
        const liquidityProvider = accounts[3];
        // key from hardhat.config.js
        const liquidityProviderPrvKey = '0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131';

        let userIn = Helper.expandTo18Decimals(3);
        await ksZap.zapInEth(factory.address, token.address, pool.address, liquidityProvider, 1, MaxUint256, {
          from: liquidityProvider,
          value: userIn,
        });

        const liquidity = await pool.balanceOf(liquidityProvider);

        const nonce = await pool.nonces(liquidityProvider);
        const digest = await Helper.getApprovalDigest(
          pool,
          liquidityProvider,
          ksZap.address,
          liquidity,
          nonce,
          MaxUint256
        );
        const {v, r, s} = ecsign(
          Buffer.from(digest.slice(2), 'hex'),
          Buffer.from(liquidityProviderPrvKey.slice(2), 'hex')
        );

        await ksZap.zapOutEthPermit(
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
            from: liquidityProvider,
          }
        );
      });

      it('#zapOut with permit wrong factory', async () => {
        const liquidityProvider = accounts[3];
        // key from hardhat.config.js
        const liquidityProviderPrvKey = '0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131';

        let userIn = Helper.expandTo18Decimals(3);
        await ksZap.zapInEth(factory.address, token.address, pool.address, liquidityProvider, 1, MaxUint256, {
          from: liquidityProvider,
          value: userIn,
        });

        const liquidity = await pool.balanceOf(liquidityProvider);

        const nonce = await pool.nonces(liquidityProvider);
        const digest = await Helper.getApprovalDigest(
          pool,
          liquidityProvider,
          ksZap.address,
          liquidity,
          nonce,
          MaxUint256
        );
        const {v, r, s} = ecsign(
          Buffer.from(digest.slice(2), 'hex'),
          Buffer.from(liquidityProviderPrvKey.slice(2), 'hex')
        );

        await expectRevert(
          ksZap.zapOutEthPermit(
            newFactory.address,
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
              from: liquidityProvider,
            }
          ),
          'KSZap: Forbidden'
        );
      });
    });
  });
});
