pragma solidity 0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IAmplificationPair.sol";

library AmplificationLibrary {
    using SafeMath for uint256;

    uint256 public constant PRECISION = 1e18;

    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(IERC20 tokenA, IERC20 tokenB)
        internal
        pure
        returns (IERC20 token0, IERC20 token1)
    {
        require(tokenA != tokenB, "AmplificationLibrary: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != IERC20(0), "AmplificationLibrary: ZERO_ADDRESS");
    }

    function getTradeInfo(
        address pair,
        IERC20 tokenA,
        IERC20 tokenB
    )
        internal
        view
        returns (
            uint256 rReserveA,
            uint256 rReserveB,
            uint256 vReserveA,
            uint256 vReserveB,
            uint256 feeInPrecision
        )
    {
        (IERC20 token0, ) = sortTokens(tokenA, tokenB);
        uint256 rReserve0;
        uint256 rReserve1;
        uint256 vReserve0;
        uint256 vReserve1;
        (rReserve0, rReserve1, vReserve0, vReserve1, feeInPrecision) = IAmplificationPair(pair)
            .getTradeInfo();
        (rReserveA, rReserveB) = tokenA == token0
            ? (rReserve0, rReserve1)
            : (rReserve1, rReserve0);
        (vReserveA, vReserveB) = tokenA == token0
            ? (vReserve0, vReserve1)
            : (vReserve1, vReserve0);
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint256 amountIn,
        uint256 rReserveIn,
        uint256 rReserveOut,
        uint256 vReserveIn,
        uint256 vReserveOut,
        uint256 feeInPrecision
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "XYZSwapLibrary: INSUFFICIENT_INPUT_AMOUNT");
        require(rReserveIn > 0 && rReserveOut > 0, "XYZSwapLibrary: INSUFFICIENT_LIQUIDITY");
        require(feeInPrecision < PRECISION, "XYZSwapLibrary: INVALID_FEE");
        uint256 amountInWithFee = amountIn.mul(PRECISION - feeInPrecision).div(PRECISION);
        uint256 numerator = amountInWithFee.mul(vReserveOut);
        uint256 denominator = vReserveIn.add(amountInWithFee);
        amountOut = numerator.div(denominator);
        require(amountOut <= rReserveOut, "XYZSwapLibrary: INSUFFICIENT_LIQUIDITY");
    }

    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(
        uint256 amountOut,
        uint256 rReserveIn,
        uint256 rReserveOut,
        uint256 vReserveIn,
        uint256 vReserveOut,
        uint256 feeInPrecision
    ) internal pure returns (uint256 amountIn) {
        require(amountOut > 0, "XYZSwapLibrary: INSUFFICIENT_OUTPUT_AMOUNT");
        require(
            rReserveIn > 0 && rReserveOut > amountOut,
            "XYZSwapLibrary: INSUFFICIENT_LIQUIDITY"
        );
        require(feeInPrecision < PRECISION, "XYZSwapLibrary: INVALID_FEE");
        uint256 numerator = vReserveIn.mul(amountOut);
        uint256 denominator = vReserveOut.sub(amountOut);
        amountIn = numerator.div(denominator).add(1);
        // amountIn = floor(amountIN *PRECISION / (PRECISION - feeInPrecision));
        numerator = amountIn.mul(PRECISION);
        denominator = PRECISION - feeInPrecision;
        amountIn = numerator.add(denominator - 1).div(denominator);
    }

    function getAmountsOut(
        uint256 amountIn,
        address[] memory pairsPath,
        IERC20[] memory path
    ) internal view returns (uint256[] memory amounts) {
        require(path.length >= 2, "invalid Path");
        require(pairsPath.length == path.length - 1, "invalid pairsPath");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (
                uint256 rReserveIn,
                uint256 rReserveOut,
                uint256 vReserveIn,
                uint256 vReserveOut,
                uint256 feeInPrecision
            ) = getTradeInfo(pairsPath[i], path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(
                amounts[i],
                rReserveIn,
                rReserveOut,
                vReserveIn,
                vReserveOut,
                feeInPrecision
            );
        }
    }

    // performs chained getAmountIn calculations on any number of pairs
    function getAmountsIn(
        uint256 amountOut,
        address[] memory pairsPath,
        IERC20[] memory path
    ) internal view returns (uint256[] memory amounts) {
        require(path.length >= 2, "invalid Path");
        require(pairsPath.length == path.length - 1, "invalid pairsPath");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (
                uint256 rReserveIn,
                uint256 rReserveOut,
                uint256 vReserveIn,
                uint256 vReserveOut,
                uint256 feeInPrecision
            ) = getTradeInfo(pairsPath[i], path[i], path[i + 1]);
            amounts[i - 1] = getAmountIn(
                amounts[i],
                rReserveIn,
                rReserveOut,
                vReserveIn,
                vReserveOut,
                feeInPrecision
            );
        }
    }
}
