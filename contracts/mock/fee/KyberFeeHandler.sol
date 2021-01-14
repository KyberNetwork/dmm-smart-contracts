pragma solidity 0.6.6;

import "@kyber.network/utils-sc/contracts/Utils.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@kyber.network/utils-sc/contracts/IERC20Ext.sol";

import "./IKyberDao.sol";

contract DaoOperator {
    address public daoOperator;

    constructor(address _daoOperator) public {
        require(_daoOperator != address(0), "daoOperator is 0");
        daoOperator = _daoOperator;
    }

    modifier onlyDaoOperator() {
        require(msg.sender == daoOperator, "only daoOperator");
        _;
    }
}

/**
 * @title kyberFeeHandler
 *
 * @dev removed rebated and burn
 */
contract KyberFeeHandler is Utils, DaoOperator, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Ext;

    IKyberDao public immutable kyberDao;

    mapping(address => mapping(IERC20Ext => uint256)) public platformFee;
    mapping(uint256 => mapping(IERC20Ext => uint256)) public rewardsPerEpoch;
    mapping(uint256 => mapping(IERC20Ext => uint256)) public rewardsPaidPerEpoch;
    // hasClaimedReward[staker][epoch]: true/false if the staker has/hasn't claimed the reward for an epoch
    mapping(address => mapping(uint256 => mapping(IERC20Ext => bool))) public hasClaimedReward;
    mapping(IERC20Ext => uint256) public reserves; // total balance in the contract that is for reward and platform fee
    mapping(address => bool) public isFeePusher;

    event FeeDistributed(
        IERC20Ext indexed token,
        address indexed _platformWallet,
        uint256 platformFeeWei,
        uint256 rewardWei
    );
    event RewardPaid(
        address indexed staker,
        uint256 indexed epoch,
        IERC20Ext indexed token,
        uint256 amount
    );
    event PlatformFeePaid(
        address indexed _platformWallet,
        IERC20Ext indexed token,
        uint256 amount
    );
    event AddFeePusher(address feePusher, bool isAdd);

    constructor(IKyberDao _kyberDao, address _daoOperator) public DaoOperator(_daoOperator) {
        require(_kyberDao != IKyberDao(0), "_kyberDao 0");

        kyberDao = _kyberDao;
    }

    function addFeePusher(address feePusher, bool isAdd) external onlyDaoOperator {
        isFeePusher[feePusher] = isAdd;

        emit AddFeePusher(feePusher, isAdd);
    }

    /// @dev handleFees function is called per trade on kyberNetwork. unless the trade is not involving any fees.
    /// @param token Token currency of fees
    /// @param _platformWallet Wallet address that will receive the platfrom fee.
    /// @param _platformFee Fee amount (in wei) the platfrom wallet is entitled to.
    function handleFees(
        IERC20Ext token,
        address _platformWallet,
        uint256 _platformFee
    ) external payable nonReentrant {
        require(isFeePusher[msg.sender], "only feePusher");
        uint256 totalFee = token.balanceOf(address(this)).sub(reserves[token]);
        uint256 networkFee = totalFee.sub(_platformFee);

        // handle platform fee
        if (_platformFee != 0) {
            platformFee[_platformWallet][token] = platformFee[_platformWallet][token].add(
                _platformFee
            );
        }
        reserves[token] = reserves[token].add(totalFee);

        uint256 epoch = getCurrentEpochNumber();

        if (networkFee != 0) {
            rewardsPerEpoch[epoch][token] = rewardsPerEpoch[epoch][token].add(networkFee);
        }

        emit FeeDistributed(token, _platformWallet, _platformFee, networkFee);
    }

    /// @notice  WARNING When staker address is a contract,
    ///          it should be able to receive claimed reward in ETH whenever anyone calls this function.
    /// @dev not revert if already claimed or reward percentage is 0
    ///      allow writing a wrapper to claim for multiple epochs
    /// @param staker address.
    /// @param epoch for which epoch the staker is claiming the reward
    function claimStakerReward(
        address staker,
        IERC20Ext token,
        uint256 epoch
    ) external nonReentrant returns (uint256 amountWei) {
        if (hasClaimedReward[staker][epoch][token]) {
            // staker has already claimed reward for the epoch
            return 0;
        }

        // the relative part of the reward the staker is entitled to for the epoch.
        // units Precision: 10 ** 18 = 100%
        // if the epoch is current or in the future, kyberDao will return 0 as result
        uint256 percentageInPrecision = kyberDao.getPastEpochRewardPercentageInPrecision(
            staker,
            epoch
        );
        if (percentageInPrecision == 0) {
            return 0; // not revert, in case a wrapper wants to claim reward for multiple epochs
        }
        require(percentageInPrecision <= PRECISION, "percentage too high");

        // Amount of reward to be sent to staker
        uint256 rewardAllStaker = rewardsPerEpoch[epoch][token];
        amountWei = rewardAllStaker.mul(percentageInPrecision).div(PRECISION);
        {
            uint256 newRewardPaid = rewardsPaidPerEpoch[epoch][token].add(amountWei);
            assert(newRewardPaid <= rewardAllStaker); // redundant check, can't happen
            rewardsPaidPerEpoch[epoch][token] = newRewardPaid;
        }

        reserves[token] = reserves[token].sub(amountWei);
        hasClaimedReward[staker][epoch][token] = true; // SSTORE

        // send reward to staker
        token.safeTransfer(staker, amountWei);

        emit RewardPaid(staker, epoch, token, amountWei);
    }

    /// @dev claim accumulated fee per platform wallet. Called by any address
    /// @param _platformWallet the wallet to claim fee for. Total accumulated fee sent to this wallet.
    /// @return amountWei amount of fee claimed
    function claimPlatformFee(address _platformWallet, IERC20Ext token)
        external
        nonReentrant
        returns (uint256 amountWei)
    {
        require(platformFee[_platformWallet][token] > 1, "no fee to claim");
        // Get total amount of fees accumulated
        amountWei = platformFee[_platformWallet][token].sub(1);

        reserves[token] = reserves[token].sub(amountWei);

        platformFee[_platformWallet][token] = 1; // avoid zero to non zero storage cost

        token.safeTransfer(_platformWallet, amountWei);

        emit PlatformFeePaid(_platformWallet, token, amountWei);
        return amountWei;
    }

    function getCurrentEpochNumber() internal view returns (uint256 epoch) {
        IKyberDao _kyberDao = kyberDao;
        if (_kyberDao == IKyberDao(0)) {
            return 0;
        } else {
            return _kyberDao.getCurrentEpochNumber();
        }
    }
}
