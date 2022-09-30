const { assert, expect } = require("chai");
const { deployments, getNamedAccounts, ethers } = require("hardhat");

describe("Testing FundMe Contract", function () {
    let fundMeContract;
    let mockV3AggregrizzyContract;
    let signer;
    let deployer;
    const ethValueToSend = 1e18; // 1 ETH in WEI.

    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        signer = await ethers.getSigners();
        fundMeContract = await ethers.getContract("FundMe", deployer);
        mockV3AggregrizzyContract = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        );
    });

    describe("Testing the constructor", function () {
        it("Address of priceFeed used in FundMe should equal MockV3Aggregator", async () => {
            let priceFeedAddress = await fundMeContract.priceFeed();
            let mockV3AggregatorAddress = mockV3AggregrizzyContract.address;
            let owner = await fundMeContract.i_owner();
            assert.equal(priceFeedAddress, mockV3AggregatorAddress);
            assert.equal(owner, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
        });
    });

    describe("Testing fund method", function () {
        it("shouldRevertIfValueIsBelowMinimumUsdAmount", async () => {
            const value = 0; // 1 ETH (18 quintillion WEI)
            await expect(
                fundMeContract.fund({ value: value })
            ).to.be.revertedWith("Must send at least 50 USD in ETH.");
        });

        it("mapContainsFundedAmountForAddressProvidingFunding", async () => {
            const value = ethers.utils.parseEther("1");
            await fundMeContract.fund({ value: value });
            let fundedAmount = await fundMeContract.addressToAmountFunded(
                deployer
            );
            assert.equal(fundedAmount.toString(), value.toString());
        });
    });
    describe("Testing withdraw method", function () {});
});
