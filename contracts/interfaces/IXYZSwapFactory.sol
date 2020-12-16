pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IXYZSwapFactory {
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 totalPair
    );

    function createPair(IERC20 tokenA, IERC20 tokenB) external returns (address pair);

    function setFeeTo(address) external;

    function setFeeToSetter(address) external;

    function feeTo() external view returns (address);

    function feeToSetter() external view returns (address);

    function getPair(IERC20 tokenA, IERC20 tokenB) external view returns (address pair);

    function allPairs(uint256) external view returns (address pair);

    function allPairsLength() external view returns (uint256);
}
