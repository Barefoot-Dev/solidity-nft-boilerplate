const deployment = require("../deployments.json");
const hre = require("hardhat");
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "../.env") });

const alchemyKey: string | undefined = process.env.ALCHEMY_KEY;
if (!alchemyKey) {
  throw new Error("Please set your ALCHEMY_KEY in a .env file");
}

export async function getContract(chainId: string) {
  // find the contract address created at the last run of hardhat deploy
  const deploymentInfo = deployment[chainId];
  if (!deploymentInfo)
    // did you run hardhat deploy with the export-all flag?
    throw `Error: no network found in deployments.json for chainId ${chainId}`;

  const networkName = Object.keys(deploymentInfo)[0]; // get the first key
  const address = deploymentInfo[networkName].contracts.CryptoArt.address;

  // load the contract via ethers.js
  const Contract = await hre.ethers.getContractFactory("CryptoArt");
  if (!Contract) {
    throw new Error("Error: could not load contract factory"); // check the name ^
  }
  const contract = await Contract.attach(address);
  console.log("got deployed contract", contract.address);

  // get a provider for estimating gas
  const provider = new hre.ethers.providers.AlchemyProvider(
    networkName,
    alchemyKey
  );

  return { contract, provider, networkName };
}
