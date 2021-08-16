//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TCashProposal {
    IERC20 public constant TORN = IERC20(0x77777FeDdddFfC19Ff86DB637967013e6C6A116C);

    function executeProposal() public {
        require(TORN.transfer(address(0x2Aa1953bc1213935Eb3ceEF04DE00428C6C7B808), 50000106000000000000000), "Unable to send TORN to airdrop contract");
    }
}
