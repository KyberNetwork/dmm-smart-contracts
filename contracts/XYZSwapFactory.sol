pragma solidity 0.6.6;

import "@openzeppelin/contracts/utils/EnumerableSet.sol";

import "./interfaces/IXYZSwapFactory.sol";
import "./XYZSwapPair.sol";

contract XYZSwapFactory is IXYZSwapFactory {
    using EnumerableSet for EnumerableSet.AddressSet;

    address public override feeTo;
    address public override feeToSetter;

    mapping(IERC20 => mapping(IERC20 => EnumerableSet.AddressSet)) internal tokenPairs;
    address[] public override allPairs;

    event PairCreated(
        IERC20 indexed token0,
        IERC20 indexed token1,
        address pair,
        uint32 ampBps,
        uint224 baseRate,
        uint256 totalPair
    );

    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }

    function createPair(
        IERC20 tokenA,
        IERC20 tokenB,
        uint32 ampBps,
        uint224 baseRate
    ) external override returns (address) {
        require(tokenA != tokenB, "XYZSwap: IDENTICAL_ADDRESSES");
        (IERC20 token0, IERC20 token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(address(token0) != address(0), "XYZSwap: ZERO_ADDRESS");
        address pair = address(new XYZSwapPair());
        XYZSwapPair(pair).initialize(token0, token1, ampBps, baseRate);
        tokenPairs[token0][token1].add(pair);
        tokenPairs[token1][token0].add(pair);
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, ampBps, baseRate, allPairs.length);
    }

    function setFeeTo(address _feeTo) external override {
        require(msg.sender == feeToSetter, "XYZSwap: FORBIDDEN");
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external override {
        require(msg.sender == feeToSetter, "XYZSwap: FORBIDDEN");
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external override view returns (uint256) {
        return allPairs.length;
    }

    function getPairs(IERC20 token0, IERC20 token1)
        external
        override
        view
        returns (address[] memory _tokenPairs)
    {
        uint256 length = tokenPairs[token0][token1].length();
        _tokenPairs = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            _tokenPairs[i] = tokenPairs[token0][token1].at(i);
        }
    }

    function getPairsLength(IERC20 token0, IERC20 token1) external view returns (uint256) {
        return tokenPairs[token0][token1].length();
    }

    function getPairAtIndex(
        IERC20 token0,
        IERC20 token1,
        uint256 index
    ) external view returns (address _tokenPair) {
        return tokenPairs[token0][token1].at(index);
    }

    function isPair(
        IERC20 token0,
        IERC20 token1,
        address pair
    ) external override view returns (bool) {
        return tokenPairs[token0][token1].contains(pair);
    }
}
