import { expect } from "chai";
import { ethers } from "hardhat";

describe("Minting", function () {
  it("Mints a token", async function () {
    // deploy a contract to the local Hardhat Network
    const CryptoArt = await ethers.getContractFactory("CryptoArt");
    const cryptoart = await CryptoArt.deploy();
    await cryptoart.deployed();

    // get the mint price
    const mintPrice = await cryptoart.mintPrice();

    // mint one token and send the required value (mintPrice)
    await cryptoart.mint(1, { value: mintPrice });

    // get the numer of tokens minted to this newly deployed contract
    const supply = await cryptoart.totalSupply();

    // ensure that the supply is exactly 1
    await expect(supply).to.equal(1);
  });
});

describe("Utilities", function () {
  it("Sets a base URI", async function () {
    // deploy a contract to the local Hardhat Network
    const CryptoArt = await ethers.getContractFactory("CryptoArt");
    const cryptoart = await CryptoArt.deploy();
    await cryptoart.deployed();

    // make a fake URI
    const URI = "ipfs://testCID/";

    // set the base URI
    await cryptoart.setBaseURI(URI);

    // mint a token
    const mintPrice = await cryptoart.mintPrice();
    await cryptoart.mint(1, { value: mintPrice });

    // get the newly minted token's tokenURI
    const tokenURI = await cryptoart.tokenURI(0);

    // check the value
    await expect(tokenURI).to.equal(URI + "0");
  });
});
