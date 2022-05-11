import { proposeTransaction } from "./gnosis";
import { getContract } from "./utils";
const hre = require("hardhat");
const config = require("../config.json");

async function main() {
  // get the contract
  const chainId = await hre.getChainId();
  const { contract, networkName } = await getContract(chainId);

  // get the original deployer's address
  const { getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  // change the owner and store the transaction receipt
  // get the hex code of the desired txn
  const methodSignature = await contract.interface.encodeFunctionData(
    "transferOwnership",
    [deployer]
  );

  // propose the txn
  const result = await proposeTransaction(
    chainId,
    config.gnosisSafeAddress[networkName],
    contract.address,
    methodSignature
  );
  console.log("got result", result);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
