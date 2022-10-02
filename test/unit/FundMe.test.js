const { assert, expect } = require("chai");
const { deployments, getNamedAccounts, ethers } = require("hardhat");

describe("Testing FundMe Contract", function() {
    let fundMeContract;
    let mockV3AggregrizzyContract;
    let signer;
    let deployer;
    const ethValueToSend = 1e18; // 1 ETH in WEI.

    beforeEach(async function() {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        signers = await ethers.getSigners();
        fundMeContract = await ethers.getContract("FundMe", deployer);
        mockV3AggregrizzyContract = await ethers.getContract("MockV3Aggregator", deployer);
    });

    describe("Testing the constructor", function() {
        it("Address of priceFeed used in FundMe should equal MockV3Aggregator", async () => {
            let priceFeedAddress = await fundMeContract.s_priceFeed();
            let mockV3AggregatorAddress = mockV3AggregrizzyContract.address;
            let owner = await fundMeContract.i_owner();
            assert.equal(priceFeedAddress, mockV3AggregatorAddress);
            assert.equal(owner, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
        });
    });

    describe("Testing fund method", function() {
        it("shouldRevertIfValueIsBelowMinimumUsdAmount", async () => {
            const value = 0; // 1 ETH (18 quintillion WEI)
            await expect(fundMeContract.fund({ value: value })).to.be.revertedWith("Must send at least 50 USD in ETH.");
        });

        it("mapContainsFundedAmountForAddressProvidingFunding", async () => {
            const value = ethers.utils.parseEther("1");
            await fundMeContract.fund({ value: value });
            let fundedAmount = await fundMeContract.s_addressToAmountFunded(deployer);
            assert.equal(fundedAmount.toString(), value.toString());
        });

        it("FundersArrayShouldBeUpdatedWithFundersAddress", async () => {
            // given
            const value = ethers.utils.parseEther("1");
            const addr15 = signers[14];

            // when
            await fundMeContract.fund({ value: value });
            await fundMeContract.connect(addr15).fund({
                value: value
            });
            const fundersAddress = await fundMeContract.s_funders(0);

            // then
            const allFunders = await fundMeContract.getFunders();
            assert.equal(fundersAddress, deployer);
            assert.equal(allFunders.length, 2);
        });
    });

    describe("Testing withdraw method", function() {
        // This is done so at least the contract has a balance we can withdraw from.
        beforeEach(async () => {
            const value = ethers.utils.parseEther("1");
            await fundMeContract.fund({ value: value });
        });

        it("deployerShouldWithdrawBalance", async function() {
            // given
            // 1000000000000000000
            const contractsInitialBalance = await ethers.provider.getBalance(fundMeContract.address);
            // 9998996998538464606783
            const deployerInitialBalance = await ethers.provider.getBalance(deployer);

            // when
            const txnResponse = await fundMeContract.withdraw();
            const txnReceipt = await txnResponse.wait(1);

            // need balance of deployer now.
            // 0
            const contractFinalBalance = await ethers.provider.getBalance(fundMeContract.address);
            // 9998996998538464606783
            const deployerFinalBalance = await ethers.provider.getBalance(deployer);
            // { 37313, 1595528926}
            const { gasUsed, effectiveGasPrice } = txnReceipt;
            // 59533970815838
            const totalGasCost = gasUsed.mul(effectiveGasPrice);

            // Total Funds to Start
            const initialTotalFunds = contractsInitialBalance.add(deployerInitialBalance);
            const finalTotalFunds = contractFinalBalance.add(deployerFinalBalance).add(totalGasCost);

            // then
            assert.equal(initialTotalFunds.toString(), finalTotalFunds.toString());

            let funders = await fundMeContract.getFunders();
            assert.equal(funders.length, 0);

            let fundedAmountByDeployer = await fundMeContract.s_addressToAmountFunded(deployer);
            assert.equal(fundedAmountByDeployer, 0);
        });

        it("shouldRevertIfWithdrawIsNotFromOwner", async () => {
            // given - non owner account
            const notOwnerAccount = signers[5];

            // when - attempting to withdraw | then - txn should revert
            await expect(fundMeContract.connect(notOwnerAccount).withdraw()).to.be.reverted;
        });
    });

    describe("testGasEfficientCheapWithdraw", () => {
        beforeEach(async () => {
            await fundMeContract.fund({ value: ethers.utils.parseEther("1") }); // This is executed by the deployer, signer[0].
        });

        it("shouldWithdrawFundsToDeployer", async function() {
            // given - deployer
            const initialContractBalance = await ethers.provider.getBalance(fundMeContract.address);
            const initialDeployerBalance = await ethers.provider.getBalance(deployer);
            console.log(`Inital amount funded to contract: ${initialContractBalance}`);
            console.log(`Initial deployer Balance: ${initialDeployerBalance}`);

            // when
            let txnResponse = await fundMeContract.cheaperWithdraw();
            let txnReceipt = await txnResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = txnReceipt;

            // then
            let finalDeployerBalance = await ethers.provider.getBalance(deployer);
            const totalGasCost = effectiveGasPrice.mul(gasUsed);
            console.log(`Deployers final balance: ${finalDeployerBalance}`);
            console.log(`total gas cost: ${gasUsed.mul(effectiveGasPrice)}`);
            const endBalance = initialDeployerBalance
                .add(initialContractBalance)
                .sub(totalGasCost)
                .toString();
            console.log(`End balance, contracts initial balance - gas fees by deployer ${endBalance}`);
            assert.equal(finalDeployerBalance.toString(), endBalance.toString());
        });
    });

    describe("sendingEtherToContractDirectlyToTestReceive", function() {
        it("sendingFundsDirectlyToContact", async () => {
            // given - address
            const senderAddress = signers[4];
            let privateKey = "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";
            let wallet = new ethers.Wallet(privateKey, ethers.provider);
            const sendValue = ethers.utils.parseEther("1");
            const contractAddress = fundMeContract.address;

            // when
            // creating a transaction object
            let txn = {
                to: contractAddress,
                value: sendValue
            };
            await wallet.sendTransaction(txn);

            // then
            const finalContractBalance = await ethers.provider.getBalance(contractAddress);
            assert.equal(finalContractBalance.toString(), sendValue.toString());
        });
    });
});
