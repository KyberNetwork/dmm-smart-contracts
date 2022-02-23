// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.6.12;

import "@openzeppelin/contracts/utils/EnumerableSet.sol";

import "./interfaces/IKSFactory.sol";
import "./KSPool.sol";

contract KSFactory is IKSFactory {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 internal constant BPS = 10000;

    address private feeTo;
    uint16 private governmentFeeBps;
    address public override feeToSetter;

    /// @dev fee to set for pools
    mapping(uint16 => bool) public feeOptions;

    mapping(IERC20 => mapping(IERC20 => EnumerableSet.AddressSet)) internal tokenPools;
    mapping(IERC20 => mapping(IERC20 => address)) public override getUnamplifiedPool;
    address[] public override allPools;

    event PoolCreated(
        IERC20 indexed token0,
        IERC20 indexed token1,
        address pool,
        uint32 ampBps,
        uint16 feeBps,
        uint256 totalPool
    );
    event SetFeeConfiguration(address feeTo, uint16 governmentFeeBps);
    event EnableFeeOption(uint16 feeBps);
    event DisableFeeOption(uint16 feeBps);
    event SetFeeToSetter(address feeToSetter);

    modifier onlyFeeSetter() {
        require(msg.sender == feeToSetter, "only fee setter");
        _;
    }

    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;

        feeOptions[1] = true;
        feeOptions[5] = true;
        feeOptions[30] = true;
        feeOptions[50] = true;
        feeOptions[100] = true;
    }

    function createPool(
        IERC20 tokenA,
        IERC20 tokenB,
        uint32 ampBps,
        uint16 feeBps
    ) external override returns (address pool) {
        require(tokenA != tokenB, "KS: IDENTICAL_ADDRESSES");
        (IERC20 token0, IERC20 token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(address(token0) != address(0), "KS: ZERO_ADDRESS");
        require(ampBps >= BPS, "KS: INVALID_BPS");
        // only exist 1 unamplified pool of a pool.
        require(
            ampBps != BPS || getUnamplifiedPool[token0][token1] == address(0),
            "KS: UNAMPLIFIED_POOL_EXISTS"
        );
        require(feeOptions[feeBps], "KS: FEE_OPTION_NOT_EXISTS");
        pool = address(new KSPool());
        KSPool(pool).initialize(token0, token1, ampBps, feeBps);
        // populate mapping in the reverse direction
        tokenPools[token0][token1].add(pool);
        tokenPools[token1][token0].add(pool);
        if (ampBps == BPS) {
            getUnamplifiedPool[token0][token1] = pool;
            getUnamplifiedPool[token1][token0] = pool;
        }
        allPools.push(pool);

        emit PoolCreated(token0, token1, pool, ampBps, feeBps, allPools.length);
    }

    function setFeeConfiguration(address _feeTo, uint16 _governmentFeeBps)
        external
        override
        onlyFeeSetter
    {
        require(_governmentFeeBps > 0 && _governmentFeeBps < 2000, "KS: INVALID FEE");
        feeTo = _feeTo;
        governmentFeeBps = _governmentFeeBps;

        emit SetFeeConfiguration(_feeTo, _governmentFeeBps);
    }

    function enableFeeOption(uint16 _feeBps) external override onlyFeeSetter {
        require(_feeBps > 0, "KS: INVALID FEE");
        feeOptions[_feeBps] = true;

        emit EnableFeeOption(_feeBps);
    }

    function disableFeeOption(uint16 _feeBps) external override onlyFeeSetter {
        require(_feeBps > 0, "KS: INVALID FEE");
        feeOptions[_feeBps] = false;

        emit DisableFeeOption(_feeBps);
    }

    function setFeeToSetter(address _feeToSetter) external override onlyFeeSetter {
        feeToSetter = _feeToSetter;

        emit SetFeeToSetter(_feeToSetter);
    }

    function getFeeConfiguration()
        external
        override
        view
        returns (address _feeTo, uint16 _governmentFeeBps)
    {
        _feeTo = feeTo;
        _governmentFeeBps = governmentFeeBps;
    }

    function allPoolsLength() external override view returns (uint256) {
        return allPools.length;
    }

    function getPools(IERC20 token0, IERC20 token1)
        external
        override
        view
        returns (address[] memory _tokenPools)
    {
        uint256 length = tokenPools[token0][token1].length();
        _tokenPools = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            _tokenPools[i] = tokenPools[token0][token1].at(i);
        }
    }

    function getPoolsLength(IERC20 token0, IERC20 token1) external view returns (uint256) {
        return tokenPools[token0][token1].length();
    }

    function getPoolAtIndex(
        IERC20 token0,
        IERC20 token1,
        uint256 index
    ) external view returns (address pool) {
        return tokenPools[token0][token1].at(index);
    }

    function isPool(
        IERC20 token0,
        IERC20 token1,
        address pool
    ) external override view returns (bool) {
        return tokenPools[token0][token1].contains(pool);
    }
}
