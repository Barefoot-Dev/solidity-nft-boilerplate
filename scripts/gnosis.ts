import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { ethers } from "ethers";
import {
  SafeTransactionData,
  SafeTransaction,
} from "@gnosis.pm/safe-core-sdk-types";
import SafeServiceClient from "@gnosis.pm/safe-service-client";
import {
  SafeMultisigTransactionEstimate,
  SafeMultisigTransactionEstimateResponse,
} from "@gnosis.pm/safe-service-client";
import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";

// API
// https://safe-transaction.rinkeby.gnosis.io/

dotenvConfig({ path: resolve(__dirname, "./.env") });
const sk: string | undefined = process.env.PRIVATE_KEY;
if (!sk) {
  throw "Please set your PRIVATE_KEY in a .env file";
}

const alchemyKey: string | undefined = process.env.ALCHEMY_KEY;
if (!alchemyKey) {
  throw new Error("Please set your ALCHEMY_KEY in a .env file");
}

// as per example https://github.com/scaffold-eth/scaffold-eth/blob/gnosis-starter-kit/packages/react-app/src/views/EthSignSignature.jsx
// we need to mock a SafeSignature to manually run addSignature method
// to get the UI-sourced signature onto the transaction prior to executeTransaction
const Signature = class CustomSignature {
  signer: string;
  data: string;
  constructor(signer: string, data: string) {
    this.signer = signer;
    this.data = data;
  }
  staticPart() {
    return this.data;
  }
  dynamicPart() {
    return "";
  }
};

export async function getProvider(chainId: string) {
  let provider;
  if (chainId === "1") {
    provider = new ethers.providers.AlchemyProvider(1, alchemyKey);
  } else if (chainId === "4") {
    provider = new ethers.providers.AlchemyProvider(4, alchemyKey);
  } else {
    throw "Unsupported chainId";
  }
  return provider;
}

export async function proposeTransaction(
  chainId: string, // e.g. '4' for rinkeby
  gnosisSafeAddress: string, // address
  contractAddress: string, // address
  methodSignature: string // hex
) {
  console.log("Getting provider");
  const provider = await getProvider(chainId);

  console.log("Getting signer");
  // @ts-ignore
  const signer = new ethers.Wallet(sk, provider);

  const ethAdapterOwner = new EthersAdapter({
    ethers,
    signer: signer,
  });

  // get an instance of the safe-service-client
  let safeService;
  if (chainId === "1") {
    safeService = new SafeServiceClient({
      txServiceUrl: "https://safe-transaction.gnosis.io/",
      ethAdapter: ethAdapterOwner,
    });
  } else if (chainId === "4") {
    safeService = new SafeServiceClient({
      txServiceUrl: "https://safe-transaction.rinkeby.gnosis.io/",
      ethAdapter: ethAdapterOwner,
    });
  } else {
    throw "Unsupported chainId";
  }

  console.log("Getting safe sdk", ethAdapterOwner, gnosisSafeAddress);
  const safeSdk: Safe = await Safe.create({
    ethAdapter: ethAdapterOwner,
    safeAddress: gnosisSafeAddress,
  });

  // get variables requires as inputs to the transaction

  // nonce
  const nonce = await safeSdk.getNonce();
  console.log(`Nonce ${nonce}`);

  // estimate of gas to call this method
  const safeTransactionEstimate: SafeMultisigTransactionEstimate = {
    to: contractAddress,
    value: "0", // in Wei
    operation: 0, // 0 = CALL
    data: methodSignature, // "0x" for nothing
  };
  console.log("Estimating gas", safeTransactionEstimate);
  const gasEstimate: SafeMultisigTransactionEstimateResponse =
    await safeService.estimateSafeTransaction(
      gnosisSafeAddress,
      safeTransactionEstimate
    );
  console.log("Got gas estimate", gasEstimate);
  const safeTxGas: number = parseInt(gasEstimate.safeTxGas);

  // docs https://docs.gnosis.io/safe/docs/contracts_tx_execution/
  const safeTransactionData: SafeTransactionData = {
    to: contractAddress,
    value: "0", // in Wei
    data: methodSignature, // "0x" for nothing
    safeTxGas: safeTxGas,
    operation: 0, // 0 = CALL
    gasToken: ethers.constants.AddressZero, // ether
    gasPrice: 0, // Gas price used for the refund calculation
    baseGas: 21000,
    refundReceiver: gnosisSafeAddress,
    nonce: nonce, // nonce of the safe
  };

  // prepare & sign the transaction
  const safeTransaction: SafeTransaction = await safeSdk.createTransaction(
    safeTransactionData
  );
  const txHash = await safeSdk.getTransactionHash(safeTransaction);
  console.log(`Safe tx hash = ${txHash}`);

  const signature = await safeSdk.signTransactionHash(txHash);
  safeTransaction.addSignature(signature);

  // send the transaction to the UI to collect the other signatures off chain
  console.log(`Proposing transaction`);
  await safeService.proposeTransaction({
    safeAddress: gnosisSafeAddress,
    senderAddress: signer.address,
    safeTransaction: safeTransaction,
    safeTxHash: txHash,
  });

  const threshold = await safeSdk.getThreshold();
  console.log("Safe threshold:", threshold);
  console.log(`Awaiting ${threshold} confirmation(s)`);
  let confirmed = false;
  while (!confirmed) {
    let confirmations = await safeService.getTransactionConfirmations(txHash);
    console.log(`Current num confirmations ${confirmations.count}`);
    if (confirmations.count === threshold) {
      console.log("Received all required confirmations!");
      console.log(confirmations);
      confirmed = true;
      // the 0th confirmation is the one already provided above in code
      // the 1st is the newly acquired confirmation from the UI
      // get that and add it to the transaction object
      // (the signature of the first signer (the sdk) is added inside executeTransaction)
      for (let i = 1; i < confirmations.results.length; i++) {
        const signature = confirmations.results[i];
        await safeTransaction.addSignature(
          new Signature(signature.owner, signature.signature)
        );
      }
      // const confirmation = confirmations.results[1];
      // console.log("adding signature2 from UI confirmation", confirmation);
      // const signature2 = new Signature(
      //   confirmation.owner,
      //   confirmation.signature
      // );
      // await safeTransaction.addSignature(signature2);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  const approvers = await safeSdk.getOwnersWhoApprovedTx(txHash);
  console.log("approvers", approvers);
  console.log("signatures", safeTransaction.signatures);

  // use ethers.js to guess the gas price to use
  const gasPriceBN = await provider.getGasPrice();
  let gasPrice = gasPriceBN.toNumber();
  console.log("got gasPrice", gasPrice);
  // option to increase the gas price via the config
  console.log(`Executing with gasPrice = ${gasPrice}`);

  // ensure the gas price was returned and is not nan
  if (gasPrice && !isNaN(gasPrice)) {
    const executeTxResponse = await safeSdk.executeTransaction(
      safeTransaction,
      {
        gasPrice: gasPrice,
      }
    );

    let executed = false;
    while (!executed) {
      console.log("awaiting tx execution");
      const tx = await safeService.getTransaction(txHash);
      if (tx.isExecuted) {
        console.log(`Tx executed!`);
        // hash is null until executin
        console.log(`Hash: ${tx.transactionHash}`);
        console.log(tx);
        executed = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
    await executeTxResponse.transactionResponse?.wait();
    console.log(
      `Executed tx hash: ${executeTxResponse.transactionResponse?.hash}`
    );
  } else {
    console.log(`Could not execute transaction with gasPrice ${gasPrice}`);
  }
}
