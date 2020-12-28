pragma solidity 0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./libraries/MathExt.sol";
import "./libraries/FeeFomula.sol";
import "./libraries/ERC20Permit.sol";
import "./interfaces/IXYZSwapFactory.sol";
import "./interfaces/IXYZSwapCallee.sol";

contract AmplificationPair is ERC20Permit, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct ReserveData {
        uint256 virtualReserve0;
        uint256 virtualReserve1;
        uint256 realReserve0;
        uint256 realReserve1;
        uint256 amplFactorBps;
    }

    uint256 public constant MINIMUM_LIQUIDITY = 10**3;

    address public factory;
    IERC20 public token0;
    IERC20 public token1;

    /// @dev uses single storage slot, accessible via getReserveData
    uint112 internal virtualReserve0;
    uint112 internal virtualReserve1;
    uint32 internal blockTimestampLast;
    uint112 internal realReserve0;
    uint112 internal realReserve1;
    uint32 internal amplFactorBps;

    /// @dev virtualReserve0 * virtualReserve1, as of immediately after the most recent liquidity event
    uint256 public kLast;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(
        uint256 virtualReserve0,
        uint256 virtualReserve1,
        uint256 realReserve0,
        uint256 realReserve1
    );

    constructor() public ERC20Permit("XYZSwap LP", "XYZ-LP", "1") {
        factory = msg.sender;
    }

    // called once by the factory at time of deployment
    function initialize(
        IERC20 _token0,
        IERC20 _token1,
        uint32 _amplFactorBps
    ) external {
        require(msg.sender == factory, "XYZSwap: FORBIDDEN"); // sufficient check
        require(_amplFactorBps >= 10000, "XYZSwap: invalid _amplFactorBps");
        token0 = _token0;
        token1 = _token1;
        amplFactorBps = _amplFactorBps;
    }

    /// @dev this low-level function should be called from a contract
    ///                 which performs important safety checks
    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        ReserveData memory data = getReserveData();
        uint256 balance0 = token0.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));
        uint256 amount0 = balance0.sub(data.realReserve0);
        uint256 amount1 = balance1.sub(data.realReserve1);

        bool feeOn = _mintFee(data);
        uint256 _totalSupply = totalSupply(); // gas savings, must be defined here since totalSupply can update in _mintFee
        ReserveData memory _newdata;
        if (_totalSupply == 0) {
            _newdata.realReserve0 = balance0;
            _newdata.realReserve1 = balance1;
            _newdata.virtualReserve0 = balance0.mul(data.amplFactorBps) / 10000;
            _newdata.virtualReserve1 = balance1.mul(data.amplFactorBps) / 10000;

            liquidity = MathExt.sqrt(_newdata.virtualReserve0.mul(_newdata.virtualReserve1));
            liquidity = liquidity.sub(MINIMUM_LIQUIDITY);
            _mint(address(-1), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            _newdata.realReserve0 = balance0;
            _newdata.realReserve1 = balance1;
            _newdata.virtualReserve0 = data.virtualReserve0.mul(balance0).div(data.realReserve0);
            _newdata.virtualReserve1 = data.virtualReserve1.mul(balance1).div(data.realReserve1);

            liquidity = Math.min(
                amount0.mul(_totalSupply) / data.realReserve0,
                amount1.mul(_totalSupply) / data.realReserve1
            );
        }
        require(liquidity > 0, "XYZSwap: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(_newdata);
        // reserve0 and reserve1 are up-to-date
        if (feeOn) kLast = uint256(_newdata.virtualReserve0).mul(_newdata.virtualReserve1);
        emit Mint(msg.sender, amount0, amount1);
    }

    /// @dev this low-level function should be called from a contract
    ///           which performs important safety checks
    /// @dev user must transfer LP token to this contract before call burn
    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        ReserveData memory data = getReserveData(); // gas savings
        IERC20 _token0 = token0; // gas savings
        IERC20 _token1 = token1; // gas savings

        uint256 balance0 = _token0.balanceOf(address(this));
        uint256 balance1 = _token1.balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        bool feeOn = _mintFee(data);
        uint256 _totalSupply = totalSupply(); // gas savings, must be defined here since totalSupply can update in _mintFee
        amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
        amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
        require(amount0 > 0 && amount1 > 0, "XYZSwap: INSUFFICIENT_LIQUIDITY_BURNED");
        _burn(address(this), liquidity);
        _token0.safeTransfer(to, amount0);
        _token1.safeTransfer(to, amount1);
        balance0 = _token0.balanceOf(address(this));
        balance1 = _token1.balanceOf(address(this));

        data.realReserve0 = _token0.balanceOf(address(this));
        data.realReserve1 = _token1.balanceOf(address(this));
        data.virtualReserve0 =
            data.virtualReserve0.mul(_totalSupply.sub(liquidity)) /
            _totalSupply;
        data.virtualReserve1 =
            data.virtualReserve1.mul(_totalSupply.sub(liquidity)) /
            _totalSupply;
        _update(data);
        if (feeOn) kLast = uint256(data.virtualReserve0).mul(data.virtualReserve1); // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /// @dev this low-level function should be called from a contract
    ///             which performs important safety checks
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata forwardData
    ) external nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, "XYZSwap: INSUFFICIENT_OUTPUT_AMOUNT");
        ReserveData memory data = getReserveData(); // gas savings
        require(
            amount0Out < data.realReserve0 && amount1Out < data.realReserve1,
            "XYZSwap: INSUFFICIENT_LIQUIDITY"
        );

        ReserveData memory newData;
        {
            // scope for _token{0,1}, avoids stack too deep errors
            IERC20 _token0 = token0;
            IERC20 _token1 = token1;
            require(to != address(_token0) && to != address(_token1), "XYZSwap: INVALID_TO");
            if (amount0Out > 0) _token0.safeTransfer(to, amount0Out); // optimistically transfer tokens
            if (amount1Out > 0) _token1.safeTransfer(to, amount1Out); // optimistically transfer tokens
            if (forwardData.length > 0)
                IXYZSwapCallee(to).xyzSwapCall(msg.sender, amount0Out, amount1Out, forwardData);
            newData.realReserve0 = _token0.balanceOf(address(this));
            newData.realReserve1 = _token1.balanceOf(address(this));
        }
        uint256 amount0In = newData.realReserve0 > data.realReserve0 - amount0Out
            ? newData.realReserve0 - (data.realReserve0 - amount0Out)
            : 0;
        newData.virtualReserve0 = data.virtualReserve0 + amount0In - amount0Out;

        uint256 amount1In = newData.realReserve1 > data.realReserve1 - amount1Out
            ? newData.realReserve1 - (data.realReserve1 - amount1Out)
            : 0;
        newData.virtualReserve1 = data.virtualReserve1 + amount1In - amount1Out;

        require(amount0In > 0 || amount1In > 0, "XYZSwap: INSUFFICIENT_INPUT_AMOUNT");
        {
            // scope for virtualReserveAdjusted, avoids stack too deep errors
            uint256 virtual0Adjusted = newData.virtualReserve0.mul(1000).sub(amount0In.mul(3));
            uint256 virtual1Adjusted = newData.virtualReserve1.mul(1000).sub(amount1In.mul(3));
            require(
                virtual0Adjusted.mul(virtual1Adjusted) >=
                    uint256(data.virtualReserve0).mul(data.virtualReserve1).mul(1000**2),
                "UniswapV2: K"
            );
        }
        _update(newData);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // TODO: review this
    /// @dev force balances to match reserves
    // function skim(address to) external nonReentrant {
    //     token0.safeTransfer(to, token0.balanceOf(address(this)).sub(realReserve0));
    //     token1.safeTransfer(to, token1.balanceOf(address(this)).sub(realReserve1));
    // }

    // TODO: review this
    /// @dev force reserves to match balances
    // function sync() external nonReentrant {
    //     uint256 newBalance0 = IERC20(token0).balanceOf(address(this));
    //     uint256 newBalance1 = IERC20(token1).balanceOf(address(this));
    //     require(newBalance0 < virtualReserve0, "");
    //     require(newBalance1 < virtualReserve1);

    //     ReserveData memory data;
    //     data.virtualReserve0 = virtualReserve0;
    //     data.realReserve0 = newBalance0;
    //     data.virtualReserve1 = virtualReserve1;
    //     data.realReserve1 = newBalance1;

    //     _update(data);
    // }

    function getReserves()
        external
        view
        returns (
            uint112 _virtualReserve0,
            uint112 _virtualReserve1,
            uint112 _realReserve0,
            uint112 _realReserve1
        )
    {
        _virtualReserve0 = virtualReserve0;
        _virtualReserve1 = virtualReserve1;
        _realReserve0 = realReserve0;
        _realReserve1 = realReserve1;
    }

    /// @dev returns reserve data to calculate quote amount
    function getReserveData() internal view returns (ReserveData memory data) {
        data.virtualReserve0 = virtualReserve0;
        data.virtualReserve1 = virtualReserve1;
        data.amplFactorBps = amplFactorBps;
        data.realReserve0 = realReserve0;
        data.realReserve1 = realReserve1;
    }

    /// @dev update reserves and, on the first call per block, price accumulators
    function _update(ReserveData memory data) internal {
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        virtualReserve0 = safeUint112(data.virtualReserve0);
        virtualReserve1 = safeUint112(data.virtualReserve1);
        blockTimestampLast = blockTimestamp;
        realReserve0 = safeUint112(data.realReserve0);
        realReserve1 = safeUint112(data.realReserve1);
        emit Sync(
            data.virtualReserve0,
            data.virtualReserve1,
            data.realReserve0,
            data.realReserve1
        );
    }

    /// @dev if fee is on, mint liquidity equivalent to 1/6th of the growth in sqrt(k)
    // TODO: review later
    function _mintFee(ReserveData memory data) internal returns (bool feeOn) {
        address feeTo = IXYZSwapFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint256 _kLast = kLast; // gas savings
        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK = MathExt.sqrt(
                    uint256(data.virtualReserve0).mul(data.virtualReserve1)
                );
                uint256 rootKLast = MathExt.sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint256 numerator = totalSupply().mul(rootK.sub(rootKLast));
                    uint256 denominator = rootK.mul(5).add(rootKLast);
                    uint256 liquidity = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }

    uint256 public constant MAX_UINT112 = 2**112 - 1;

    function safeUint112(uint256 x) internal pure returns (uint112) {
        require(x <= MAX_UINT112, "XYZSwap: Overflow uint112");
        return uint112(x);
    }
}
