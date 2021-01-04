pragma solidity 0.6.6;

import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./interfaces/IXYZSwapFactory.sol";
import "./interfaces/IERC20Permit.sol";
import "./interfaces/IXYZSwapPair.sol";
import "./interfaces/IWETH.sol";
import "./libraries/AmplificationLibrary.sol";

contract AmplificationRouter02 {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public immutable factory;
    address public immutable weth;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "EXPIRED");
        _;
    }

    constructor(address _factory, address _weth) public {
        factory = _factory;
        weth = _weth;
    }

    // **** ADD LIQUIDITY ****
    function _addLiquidity(
        IERC20 tokenA,
        IERC20 tokenB,
        address pair,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal virtual view returns (uint256 amountA, uint256 amountB) {
        require(pair != address(0), "invalid pair address");
        (uint256 reserveA, uint256 reserveB) = AmplificationLibrary.getReserves(
            pair,
            tokenA,
            tokenB
        );
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = AmplificationLibrary.quote(
                amountADesired,
                reserveA,
                reserveB
            );
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = AmplificationLibrary.quote(
                    amountBDesired,
                    reserveB,
                    reserveA
                );
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, "INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function addLiquidity(
        IERC20 tokenA,
        IERC20 tokenB,
        address pair,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        virtual
        ensure(deadline)
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        require(verifyPairAddress(pair), "invalid pair");
        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            pair,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );
        // using tokenA.safeTransferFrom will get "Stack too deep"
        SafeERC20.safeTransferFrom(tokenA, msg.sender, pair, amountA);
        SafeERC20.safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IXYZSwapPair(pair).mint(to);
    }

    // **** SWAP ****
    // requires the initial amount to have already been sent to the first pair
    function _swap(
        uint256[] memory amounts,
        address[] memory pairsPath,
        IERC20[] memory path,
        address _to
    ) private {
        for (uint256 i; i < path.length - 1; i++) {
            (IERC20 input, IERC20 output) = (path[i], path[i + 1]);
            (IERC20 token0, ) = AmplificationLibrary.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address to = i < path.length - 2 ? pairsPath[i + 1] : _to;
            IXYZSwapPair(pairsPath[i]).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata pairsPath,
        IERC20[] calldata path,
        address to,
        uint256 deadline
    ) external virtual ensure(deadline) returns (uint256[] memory amounts) {
        for (uint256 i = 0; i < pairsPath.length; i++) {
            require(verifyPairAddress(pairsPath[i]), "INVALID_PAIR");
        }
        amounts = AmplificationLibrary.getAmountsOut(amountIn, pairsPath, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        IERC20(path[0]).safeTransferFrom(msg.sender, pairsPath[0], amounts[0]);
        _swap(amounts, pairsPath, path, to);
    }

    // **** LIBRARY FUNCTIONS ****

    function verifyPairAddress(
        address /*pair*/
    ) internal view returns (bool) {
        return true;
    }
}
