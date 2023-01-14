//module.exports.default = deployFunc;

/* module.exports = async (hre) => {
    // hre.getNamesAccounts
    // hre.deployments
    const { getNamedAccounts, deployments } = hre;
}; */
const { verify } = require("../utils/verify");
const { network } = require("hardhat");
const {
    networkConfig,
    developmentChains,
} = require("../helper-hardhat-config");
//Is the same as:
/* const helperConfig = require("../helper-hardhat-config");
const networkConfig = helperConfig.networkConfig; */

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    //const ethUsdPriceFeed = networkConfig[chaindId]["ethUsdPriceFeed"];
    let ethUsdPriceFeedAddress;
    if (chainId == 31337) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator");
        ethUsdPriceFeedAddress = ethUsdAggregator.address;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
    }
    log("----------------------------------------------------");
    log("Deploying FundMe and waiting for confirmations...");
    // if the contract doesnt exist, we deploy a moch
    // when going for localhost or hathat network we want to use mock
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: [ethUsdPriceFeedAddress],
        log: true,
        waitConfirmations: network.config.blockConfirmation || 1,
    });

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, [ethUsdPriceFeedAddress]);
    }
    log("______________________________________");
};
module.exports.tags = ["all", "fundme"];
