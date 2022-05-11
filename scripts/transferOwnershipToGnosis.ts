import { getContract } from "./utils";
const hre = require("hardhat");
const config = require("../config.json");

async function main() {
  console.log("transfering contract ownership");
  // get the contract
  const chainId = await hre.getChainId();
  let { contract, provider, networkName } = await getContract(chainId);

  // check the initial owner
  const initOwner = await contract.owner();
  console.log("from", initOwner);

  const gnosisSafeAddress = config.gnosisSafeAddress[networkName];
  console.log("to", gnosisSafeAddress);

  // estimate the gas required
  const methodSignature = await contract.interface.encodeFunctionData(
    "transferOwnership",
    [gnosisSafeAddress]
  );
  const tx = {
    to: contract.address,
    value: 0,
    data: methodSignature,
    from: initOwner,
  };
  const gasEstimate = await provider.estimateGas(tx);

  // send the transaction to transfer ownership
  const txnReceipt = await contract.transferOwnership(gnosisSafeAddress, {
    from: initOwner,
    value: 0,
    gasLimit: gasEstimate,
  });

  console.log("txn hash", txnReceipt["hash"]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
