pragma solidity 0.6.6;

// import "./interfaces/IXYZSwapFactory.sol";

import "./AmplificationPair.sol";

contract AmplificationFactory {
    address public feeTo;
    address public feeToSetter;

    mapping(IERC20 => mapping(IERC20 => address)) public getPair;
    address[] public allPairs;

    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 totalPair
    );

    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }

    function createPair(
        IERC20 tokenA,
        IERC20 tokenB,
        uint32 amplificationBps
    ) external returns (address pair) {
        require(tokenA != tokenB, "XYZSwap: IDENTICAL_ADDRESSES");
        (IERC20 token0, IERC20 token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(address(token0) != address(0), "XYZSwap: ZERO_ADDRESS");
        // require(getPair[token0][token1] == address(0), "XYZSwap: PAIR_EXISTS"); // single check is sufficient
        bytes memory bytecode = type(AmplificationPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        AmplificationPair(pair).initialize(token0, token1, amplificationBps);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(address(token0), address(token1), pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "XYZSwap: FORBIDDEN");
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "XYZSwap: FORBIDDEN");
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}
