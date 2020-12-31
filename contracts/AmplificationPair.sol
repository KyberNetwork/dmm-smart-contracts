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
import "./VolumeTrendRecorder.sol";

contract AmplificationPair is ERC20Permit, ReentrancyGuard, VolumeTrendRecorder {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct ReserveData {
        uint256 vReserve0;
        uint256 vReserve1;
        uint256 rReserve0;
        uint256 rReserve1;
        uint256 amplFactorBps;
    }

    uint256 public constant MINIMUM_LIQUIDITY = 10**3;

    address public factory;
    IERC20 public token0;
    IERC20 public token1;

    /// @dev uses single storage slot, accessible via getReserveData
    uint112 internal vReserve0;
    uint112 internal vReserve1;
    uint32 internal blockTimestampLast;
    uint112 internal rReserve0;
    uint112 internal rReserve1;
    uint32 internal amplFactorBps;

    /// @dev vReserve0 * vReserve1, as of immediately after the most recent liquidity event
    uint256 public kLast;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to,
        uint256 feeInPrecision
    );
    event Sync(uint256 vReserve0, uint256 vReserve1, uint256 rReserve0, uint256 rReserve1);

    constructor() public ERC20Permit("XYZSwap LP", "XYZ-LP", "1") VolumeTrendRecorder(0) {
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
        uint256 amount0 = balance0.sub(data.rReserve0);
        uint256 amount1 = balance1.sub(data.rReserve1);

        bool feeOn = _mintFee(data);
        uint256 _totalSupply = totalSupply(); // gas savings, must be defined here since totalSupply can update in _mintFee
        ReserveData memory _newdata;
        if (_totalSupply == 0) {
            _newdata.rReserve0 = balance0;
            _newdata.rReserve1 = balance1;
            _newdata.vReserve0 = balance0.mul(data.amplFactorBps) / 10000;
            _newdata.vReserve1 = balance1.mul(data.amplFactorBps) / 10000;

            liquidity = MathExt.sqrt(_newdata.vReserve0.mul(_newdata.vReserve1));
            liquidity = liquidity.sub(MINIMUM_LIQUIDITY);
            _mint(address(-1), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            _newdata.rReserve0 = balance0;
            _newdata.rReserve1 = balance1;
            _newdata.vReserve0 = data.vReserve0.mul(balance0).div(data.rReserve0);
            _newdata.vReserve1 = data.vReserve1.mul(balance1).div(data.rReserve1);

            liquidity = Math.min(
                amount0.mul(_totalSupply) / data.rReserve0,
                amount1.mul(_totalSupply) / data.rReserve1
            );
        }
        require(liquidity > 0, "XYZSwap: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(_newdata);
        // reserve0 and reserve1 are up-to-date
        if (feeOn) kLast = uint256(_newdata.vReserve0).mul(_newdata.vReserve1);
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
        //TODO: may be we need to check if balance0 and balance1 match with virtual balances.
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

        data.rReserve0 = _token0.balanceOf(address(this));
        data.rReserve1 = _token1.balanceOf(address(this));
        data.vReserve0 = data.vReserve0.mul(_totalSupply.sub(liquidity)) / _totalSupply;
        data.vReserve1 = data.vReserve1.mul(_totalSupply.sub(liquidity)) / _totalSupply;
        _update(data);
        if (feeOn) kLast = uint256(data.vReserve0).mul(data.vReserve1); // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /// @dev this low-level function should be called from a contract
    /// @dev which performs important safety checks
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata forwardData
    ) external nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, "XYZSwap: INSUFFICIENT_OUTPUT_AMOUNT");
        ReserveData memory data = getReserveData(); // gas savings
        require(
            amount0Out < data.rReserve0 && amount1Out < data.rReserve1,
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
            newData.rReserve0 = _token0.balanceOf(address(this));
            newData.rReserve1 = _token1.balanceOf(address(this));
        }
        uint256 amount0In = newData.rReserve0 > data.rReserve0 - amount0Out
            ? newData.rReserve0 - (data.rReserve0 - amount0Out)
            : 0;
        newData.vReserve0 = data.vReserve0 + amount0In - amount0Out;

        uint256 amount1In = newData.rReserve1 > data.rReserve1 - amount1Out
            ? newData.rReserve1 - (data.rReserve1 - amount1Out)
            : 0;
        newData.vReserve1 = data.vReserve1 + amount1In - amount1Out;

        require(amount1In > 0 || amount1In > 0, "XYZSwap: INSUFFICIENT_INPUT_AMOUNT");
        uint256 feeInPrecision = verifyBalanceAndUpdateEma(
            amount0In,
            amount1In,
            data.vReserve0,
            data.vReserve1,
            newData.vReserve0,
            newData.vReserve1
        );

        _update(newData);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to, feeInPrecision);
    }

    /// @dev force balances to match reserves
    function skim(address to) external nonReentrant {
        token0.safeTransfer(to, token0.balanceOf(address(this)).sub(rReserve0));
        token1.safeTransfer(to, token1.balanceOf(address(this)).sub(rReserve1));
    }

    /// @dev force reserves to match balances
    function sync() external nonReentrant {
        ReserveData memory data = getReserveData();

        uint256 newBalance0 = IERC20(token0).balanceOf(address(this));
        uint256 newBalance1 = IERC20(token1).balanceOf(address(this));

        ReserveData memory newData;
        newData.vReserve0 = newBalance0.mul(data.vReserve0).div(data.rReserve0);
        newData.rReserve0 = newBalance0;
        newData.vReserve1 = newBalance1.mul(data.vReserve1).div(data.rReserve1);
        newData.rReserve1 = newBalance1;

        _update(newData);
    }

    function getTradeInfo()
        external
        view
        returns (
            uint112 _vReserve0,
            uint112 _vReserve1,
            uint112 _rReserve0,
            uint112 _rReserve1,
            uint256 feeInPrecision
        )
    {
        _vReserve0 = vReserve0;
        _vReserve1 = vReserve1;
        _rReserve0 = rReserve0;
        _rReserve1 = rReserve1;
        uint256 rFactorInPrecision = getRFactor(block.number);
        feeInPrecision = FeeFomula.getFee(rFactorInPrecision);
    }

    function verifyBalanceAndUpdateEma(
        uint256 _amount0In,
        uint256 _amount1In,
        uint256 _reserve0,
        uint256 _reserve1,
        uint256 _balance0,
        uint256 _balance1
    ) internal virtual returns (uint256 feeInPrecision) {
        // volume will be normalized into amount in token 0
        uint256 volume = _reserve0.mul(_amount1In).div(_reserve1).add(_amount0In);
        uint256 rFactorInPrecision = recordNewUpdatedVolume(block.number, volume);
        feeInPrecision = FeeFomula.getFee(rFactorInPrecision);
        //verify balance update is match with fomula
        uint256 balance0Adjusted = _balance0.mul(PRECISION).sub(_amount0In.mul(feeInPrecision));
        balance0Adjusted = balance0Adjusted.div(PRECISION);
        uint256 balance1Adjusted = _balance1.mul(PRECISION).sub(_amount1In.mul(feeInPrecision));
        balance1Adjusted = balance1Adjusted.div(PRECISION);
        require(balance0Adjusted.mul(balance1Adjusted) >= _reserve0.mul(_reserve1), "XYZSwap: K");
    }

    /// @dev update reserves and, on the first call per block, price accumulators
    function _update(ReserveData memory data) internal {
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        vReserve0 = safeUint112(data.vReserve0);
        vReserve1 = safeUint112(data.vReserve1);
        blockTimestampLast = blockTimestamp;
        rReserve0 = safeUint112(data.rReserve0);
        rReserve1 = safeUint112(data.rReserve1);
        emit Sync(data.vReserve0, data.vReserve1, data.rReserve0, data.rReserve1);
    }

    /// @dev if fee is on, mint liquidity equivalent to 1/6th of the growth in sqrt(k)
    function _mintFee(ReserveData memory data) internal returns (bool feeOn) {
        address feeTo = IXYZSwapFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint256 _kLast = kLast; // gas savings
        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK = MathExt.sqrt(uint256(data.vReserve0).mul(data.vReserve1));
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

    /// @dev returns reserve data to calculate quote amount
    function getReserveData() internal view returns (ReserveData memory data) {
        data.vReserve0 = vReserve0;
        data.vReserve1 = vReserve1;
        data.amplFactorBps = amplFactorBps;
        data.rReserve0 = rReserve0;
        data.rReserve1 = rReserve1;
    }

    uint256 public constant MAX_UINT112 = 2**112 - 1;

    function safeUint112(uint256 x) internal pure returns (uint112) {
        require(x <= MAX_UINT112, "XYZSwap: Overflow uint112");
        return uint112(x);
    }
}
