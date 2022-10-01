// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

error NotOwner();

contract FundMe {
    using PriceConverter for uint256;

    uint256 public constant MINIMUM_USD = 50 * 1e18;
    address[] public funders;
    mapping(address => uint256) public addressToAmountFunded;
    address public i_owner;
    AggregatorV3Interface public priceFeed;

    constructor(address priceFeedAddress) {
        i_owner = msg.sender; // whoever has deployed the contract will be set as the owner.
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    function getFunders() public view returns (address[] memory) {
        return funders;
    }

    // This function moves (sends) ETH so must be marked as payable.
    function fund() public payable {
        // check if the amount being funded is more than the minimum_usd amount
        require(
            msg.value.getConversionRate(priceFeed) > MINIMUM_USD,
            "Must send at least 50 USD in ETH."
        );
        addressToAmountFunded[msg.sender] += msg.value;
        funders.push(msg.sender);
    }

    // Can only be invoked successfully by the owner of the contract
    function withdraw() public onlyOwner {
        for (uint256 funderIdx = 0; funderIdx < funders.length; funderIdx++) {
            address funder = funders[funderIdx];
            addressToAmountFunded[funder] = 0;
        }
        funders = new address[](0);
        (bool isSuccessful, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(isSuccessful, "Transaction was unsuccessful");
    }

    modifier onlyOwner() {
        if (msg.sender != i_owner) revert NotOwner();
        _; // run code after condition
    }

    receive() external payable {
        fund();
    }
}
