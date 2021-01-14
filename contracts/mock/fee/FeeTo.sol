pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../../interfaces/IXYZSwapPair.sol";

interface IKyberFeeHandler {
    function handleFees(
        IERC20 token,
        address _platformWallet,
        uint256 _platformFee
    ) external;
}

contract FeeTo is Ownable {
    using SafeERC20 for IERC20;

    mapping(IERC20 => bool) public allowedToken;
    IKyberFeeHandler public kyberFeeHandler;

    event SetAllowedToken(IERC20 token, bool isAllowed);

    constructor(IKyberFeeHandler _kyberFeeHandler) public {
        kyberFeeHandler = _kyberFeeHandler;
    }

    function setAllowedToken(IERC20 token, bool isAllowed) external onlyOwner {
        allowedToken[token] = isAllowed;

        emit SetAllowedToken(token, isAllowed);
    }

    function sync(IERC20 token) external {
        if (!allowedToken[token]) {
            return; // avoid revert for unConfig token
        }
        uint256 amount = token.balanceOf(address(this));
        if (amount <= 1) {
            return;
        }
        token.safeTransfer(address(kyberFeeHandler), amount - 1); // gas saving.
        kyberFeeHandler.handleFees(token, address(0), 0);
    }

    function burn(IERC20 token) external onlyOwner {
        require(allowedToken[token], "token should be distributed");
        IXYZSwapPair pair = IXYZSwapPair(address(token));

        uint256 amount = token.balanceOf(address(this));
        if (amount <= 1) {
            return;
        }
        token.safeTransfer(address(token), amount - 1); // gas saving.
        pair.burn(address(token));
    }
}
