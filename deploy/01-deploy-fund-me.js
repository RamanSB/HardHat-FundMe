const {
    networkConfig,
    developmentChains,
} = require("../helper-hardhat-config");
const { network } = require("hardhat");
const { verify } = require("../utils/verify");

module.exports = async (hre) => {
    // extracting required elements from hre
    const { getNamedAccounts, deployments } = hre;

    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    let priceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
    if (developmentChains.includes(network.name)) {
        const ethUsdPriceFeedMock = await deployments.get("MockV3Aggregator");
        priceFeedAddress = ethUsdPriceFeedMock.address;
    }

    // when using localhost or hardhat network we want to use a mock blockchain
    const args = [priceFeedAddress];
    const fundMeContract = await deploy("FundMe", {
        from: deployer,
        args: args, // Pass in price feed address, This is the constructor argument for contract FundMe.sol
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (
        !developmentChains.includes(networkConfig[chainId]["name"]) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMeContract.address, args);
    }
    log("----------------------------");
};

module.exports.tags = ["all", "fundme"];
