// SPDX-License-Identifier: MIT

// 1. Pragma
pragma solidity ^0.8.7;

// 2. Imports
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

// 3. Custom error codes
error FundMe__NotOwner();

/**
 * @title Sample Funding Contract
 * @notice
 * @dev
 */
contract FundMe {
    // 4. Library, Interface & Contracts
    using PriceConverter for uint256;

    // 5. state variables
    address[] public s_funders;
    mapping(address => uint256) public s_addressToAmountFunded;
    AggregatorV3Interface public s_priceFeed;
    address public immutable i_owner;
    uint256 public constant MINIMUM_USD = 50 * 1e18;

    // 6. Error codes
    modifier onlyOwner() {
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        _; // run code after condition
    }

    // 7. Functions w/Ordering:
    // Functions Order:
    //// constructor
    //// receive
    //// fallback
    //// external
    //// public
    //// internal
    //// private
    //// view / pure
    constructor(address priceFeedAddress) {
        i_owner = msg.sender; // whoever has deployed the contract will be set as the owner.
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    receive() external payable {
        fund();
    }

    function getFunders() public view returns (address[] memory) {
        return s_funders;
    }

    // This function moves (sends) ETH so must be marked as payable.
    function fund() public payable {
        // check if the amount being funded is more than the minimum_usd amount
        require(msg.value.getConversionRate(s_priceFeed) > MINIMUM_USD, "Must send at least 50 USD in ETH.");
        s_addressToAmountFunded[msg.sender] += msg.value;
        s_funders.push(msg.sender);
    }

    // Can only be invoked successfully by the owner of the contract
    function withdraw() public onlyOwner {
        for (uint256 funderIdx = 0; funderIdx < s_funders.length; funderIdx++) {
            address funder = s_funders[funderIdx];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
        (bool isSuccessful, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(isSuccessful, "Transaction was unsuccessful");
    }

    // Can only be invoked successfully by the owner of the contract
    function cheaperWithdraw() public onlyOwner {
        address[] memory funders = s_funders;
        // mappings can't be in memory, sorry!
        for (uint256 funderIndex = 0; funderIndex < funders.length; funderIndex++) {
            address funder = funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
        // payable(msg.sender).transfer(address(this).balance);
        (bool success, ) = i_owner.call{value: address(this).balance}("");
        require(success);
    }
}
