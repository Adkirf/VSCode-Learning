const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

describe("FundMe", function () {
    let fundMe;
    let mockV3Aggregator;
    let deployer;
    const sendValue = ethers.utils.parseEther("1"); //1 eth = 1 *e^*18
    beforeEach(async () => {
        // const accounts = await ethers.getSigners()
        // deployer = accounts[0]
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        );
    });

    describe("constructor", function () {
        it("sets the aggregator addresses correctly", async () => {
            const response = await fundMe.getPriceFeed();
            assert.equal(response, mockV3Aggregator.address);
        });
    });

    describe("fund", function () {
        it("Fails if you dont sent enough ETH", async () => {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH"
            );
        });
        it("updates the amount funded data structure", async function () {
            await fundMe.fund({ value: sendValue });
            const response = await fundMe.s_addressToAmountFunded(deployer);
            assert.equal(response.toString(), sendValue.toString());
        });
        it("Adds funder to array of funders", async function () {
            await fundMe.fund({ value: sendValue });
            const funder = await fundMe.getFunder(0);
            assert.equal(funder, deployer);
        });
    });
    describe("withdraw", function () {
        beforeEach(async () => {
            await fundMe.fund({ value: sendValue });
        });

        it("withdraw ETH from a single founder", async () => {
            //Arrange: inital state to be tested
            const initialFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const initialFounderBalance = await fundMe.provider.getBalance(
                deployer
            );
            //Act: change state && record
            const transactionReceipt = await (await fundMe.withdraw()).wait(1);
            //get gas
            const { gasUsed, effectiveGasPrice } = await transactionReceipt;
            gasCost = gasUsed.mul(effectiveGasPrice);

            const finalFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const finalFounderBalance = await fundMe.provider.getBalance(
                deployer
            );

            //Assert: final state to be tested
            assert(finalFounderBalance, 0);
            assert(
                initialFundMeBalance.add(initialFounderBalance).toString(),
                finalFounderBalance.add(gasCost).toString()
            );
        });
        it("allows us to withdraw multiple funders", async () => {
            //Arrange
            const accounts = await ethers.getSigners();
            for (let i = 0; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i]
                );
                await fundMeConnectedContract.fund({ value: sendValue });
            }
            const initialFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const initialFounderBalance = await fundMe.provider.getBalance(
                deployer
            );
            // Act
            const transactionReceipt = await (await fundMe.withdraw()).wait(1);
            //get gas
            const { gasUsed, effectiveGasPrice } = await transactionReceipt;
            gasCost = gasUsed.mul(effectiveGasPrice);
            const finalFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const finalFounderBalance = await fundMe.provider.getBalance(
                deployer
            );
            //Assert: Make sure that funders are reset properly
            assert(finalFounderBalance, 0);
            assert(
                initialFundMeBalance.add(initialFounderBalance).toString(),
                finalFounderBalance.add(gasCost).toString()
            );
            await expect(fundMe.getFunder(0)).to.be.reverted;

            for (i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.s_addressToAmountFunded[accounts[i].address]
                ),
                    0;
            }
        });
        it("Only allows the owner to withdraw", async () => {
            const accounts = await ethers.getSigners();
            const attacker = accounts[1];
            const attackerConnectedContract = await fundMe.connect(attacker);
            await expect(
                attackerConnectedContract.withdraw()
            ).to.be.revertedWith("FundMe__NotOwner");
        });
        it("testing cheaperWithdraw...", async () => {
            //Arrange
            const accounts = await ethers.getSigners();
            for (let i = 0; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i]
                );
                await fundMeConnectedContract.fund({ value: sendValue });
            }
            const initialFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const initialFounderBalance = await fundMe.provider.getBalance(
                deployer
            );
            // Act
            const transactionReceipt = await (
                await fundMe.cheaperWithdraw()
            ).wait(1);
            //get gas
            const { gasUsed, effectiveGasPrice } = await transactionReceipt;
            gasCost = gasUsed.mul(effectiveGasPrice);
            const finalFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const finalFounderBalance = await fundMe.provider.getBalance(
                deployer
            );
            //Assert: Make sure that funders are reset properly
            assert(finalFounderBalance, 0);
            assert(
                initialFundMeBalance.add(initialFounderBalance).toString(),
                finalFounderBalance.add(gasCost).toString()
            );
            await expect(fundMe.getFunder(0)).to.be.reverted;

            for (i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.s_addressToAmountFunded[accounts[i].address]
                ),
                    0;
            }
        });
    });
});
