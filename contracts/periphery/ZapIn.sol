// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import "../libraries/MathExt.sol";
import "../libraries/DMMLibrary.sol";
import "../interfaces/IDMMPool.sol";
import "../interfaces/IDMMFactory.sol";
import "../interfaces/IWETH.sol";

/// @dev detail here: https://hackmd.io/vdqxJx8STNqPm0LG8vGWaw
contract ZapIn {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint256 private constant PRECISION = 1e18;
    uint256 internal constant Q112 = 2**112;

    IDMMFactory public factory;
    address public immutable weth;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "DMMRouter: EXPIRED");
        _;
    }

    constructor(IDMMFactory _factory, address _weth) public {
        factory = _factory;
        weth = _weth;
    }

    receive() external payable {
        assert(msg.sender == weth); // only accept ETH via fallback from the WETH contract
    }

    /// @dev swap eth to token and then add liquidity to a pool with token-weth
    /// @param tokenOut another token of the pool - not weth
    /// @param pool address of the pool
    /// @param minLpQty min of lp token after swap
    /// @param deadline the last time the transaction can be executed
    function zapInEth(
        IERC20 tokenOut,
        address pool,
        uint256 minLpQty,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256 lpQty) {
        IWETH(weth).deposit{value: msg.value}();
        (uint256 amountSwap, uint256 amountOutput) = calculateSwapAmounts(
            IERC20(weth),
            tokenOut,
            pool,
            msg.value
        );
        IERC20(weth).safeTransfer(pool, amountSwap);
        _swap(amountOutput, IERC20(weth), tokenOut, pool, address(this));

        IERC20(weth).safeTransfer(pool, msg.value.sub(amountSwap));
        tokenOut.safeTransfer(pool, amountOutput);

        lpQty = IDMMPool(pool).mint(msg.sender);
        require(lpQty >= minLpQty, "DMMRouter: INSUFFICIENT_MINT_QTY");
    }

    /// @dev swap and add liquidity to a pool with token-weth
    /// @param tokenIn the input token
    /// @param tokenOut another token of the pool
    /// @param pool address of the pool
    /// @param userIn amount of input token
    /// @param minLpQty min of lp token after swap
    /// @param deadline the last time the transaction can be executed
    function zapIn(
        IERC20 tokenIn,
        IERC20 tokenOut,
        uint256 userIn,
        address pool,
        uint256 minLpQty,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 lpQty) {
        (uint256 amountSwap, uint256 amountOutput) = calculateSwapAmounts(
            tokenIn,
            tokenOut,
            pool,
            userIn
        );

        tokenIn.safeTransferFrom(msg.sender, pool, amountSwap);
        _swap(amountOutput, tokenIn, tokenOut, pool, address(this));
        tokenIn.safeTransferFrom(msg.sender, pool, userIn.sub(amountSwap));
        tokenOut.safeTransfer(pool, amountOutput);

        lpQty = IDMMPool(pool).mint(msg.sender);
        require(lpQty >= minLpQty, "DMMRouter: INSUFFICIENT_MINT_QTY");
    }

    function calculateZapInAmounts(
        IERC20 tokenIn,
        IERC20 tokenOut,
        address pool,
        uint256 userIn
    ) external view returns (uint256 tokenInAmount, uint256 tokenOutAmount) {
        uint256 amountSwap;
        (amountSwap, tokenOutAmount) = calculateSwapAmounts(tokenIn, tokenOut, pool, userIn);
        tokenInAmount = userIn.sub(amountSwap);
    }

    function addLiquidity(
        IERC20 tokenA,
        IERC20 tokenB,
        address pool,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256[2] memory vReserveRatioBounds,
        address to,
        uint256 deadline
    )
        public
        virtual
        ensure(deadline)
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            pool,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            vReserveRatioBounds
        );
        // using tokenA.safeTransferFrom will get "Stack too deep"
        SafeERC20.safeTransferFrom(tokenA, msg.sender, pool, amountA);
        SafeERC20.safeTransferFrom(tokenB, msg.sender, pool, amountB);
        liquidity = IDMMPool(pool).mint(to);
    }

    function addLiquidityETH(
        IERC20 token,
        address pool,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        uint256[2] memory vReserveRatioBounds,
        address to,
        uint256 deadline
    )
        public
        payable
        ensure(deadline)
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        )
    {
        (amountToken, amountETH) = _addLiquidity(
            token,
            IERC20(weth),
            pool,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin,
            vReserveRatioBounds
        );
        token.safeTransferFrom(msg.sender, pool, amountToken);
        IWETH(weth).deposit{value: amountETH}();
        IERC20(weth).safeTransfer(pool, amountETH);
        liquidity = IDMMPool(pool).mint(to);
        // refund dust eth, if any
        if (msg.value > amountETH) {
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
        }
    }

    function calculateSwapAmounts(
        IERC20 tokenIn,
        IERC20 tokenOut,
        address pool,
        uint256 userIn
    ) public view returns (uint256 amountSwap, uint256 amountOutput) {
        require(factory.isPool(tokenIn, tokenOut, pool), "DMMRouter: INVALID_POOL");
        (uint256 rIn, uint256 rOut, uint256 vIn, uint256 vOut, uint256 feeInPrecision) = DMMLibrary
            .getTradeInfo(pool, tokenIn, tokenOut);
        amountSwap = _calculateSwapInAmount(rIn, rOut, vIn, vOut, feeInPrecision, userIn);
        amountOutput = DMMLibrary.getAmountOut(amountSwap, rIn, rOut, vIn, vOut, feeInPrecision);
    }

    function _swap(
        uint256 amountOut,
        IERC20 tokenIn,
        IERC20 tokenOut,
        address pool,
        address to
    ) internal {
        (IERC20 token0, ) = DMMLibrary.sortTokens(tokenIn, tokenOut);
        (uint256 amount0Out, uint256 amount1Out) = tokenIn == token0
            ? (uint256(0), amountOut)
            : (amountOut, uint256(0));
        IDMMPool(pool).swap(amount0Out, amount1Out, to, new bytes(0));
    }

    function _addLiquidity(
        IERC20 tokenA,
        IERC20 tokenB,
        address pool,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256[2] memory vReserveRatioBounds
    ) internal virtual view returns (uint256 amountA, uint256 amountB) {
        require(factory.isPool(tokenA, tokenB, pool), "DMMRouter: INVALID_POOL");
        (uint256 reserveA, uint256 reserveB, uint256 vReserveA, uint256 vReserveB, ) = DMMLibrary
            .getTradeInfo(pool, tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = DMMLibrary.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "DMMRouter: INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = DMMLibrary.quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, "DMMRouter: INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
            uint256 currentRate = (vReserveB * Q112) / vReserveA;
            require(
                currentRate >= vReserveRatioBounds[0] && currentRate <= vReserveRatioBounds[1],
                "DMMRouter: OUT_OF_BOUNDS_VRESERVE"
            );
        }
    }

    function _calculateSwapInAmount(
        uint256 rIn,
        uint256 rOut,
        uint256 vIn,
        uint256 vOut,
        uint256 feeInPrecision,
        uint256 userIn
    ) internal pure returns (uint256) {
        require(feeInPrecision < PRECISION, "invalid feeInPrecision");
        uint256 r = PRECISION - feeInPrecision;
        // b = (vOut * rIn + userIn * (vOut - rOut)) * r / PRECISION / rOut+ vIN
        uint256 b;
        {
            uint256 tmp = userIn.mul(vOut.sub(rOut));
            tmp = tmp.add(vOut.mul(rIn));
            b = tmp.div(rOut).mul(r) / PRECISION;
            b = b.add(vIn);
        }
        uint256 inverseC = vIn.mul(userIn);
        // numerator = sqrt(b^2 -4ac) - b
        uint256 numerator = MathExt.sqrt(b.mul(b).add(inverseC.mul(4).mul(r) / PRECISION)).sub(b);
        return numerator.mul(PRECISION) / (2 * r);
    }
}
