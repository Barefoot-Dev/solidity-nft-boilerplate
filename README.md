# Solidity NFT Boilerplate
A smart contract development and deployment boilerplate using Hardhat &amp; Ethers.js

# Tutorial
Find a detailed and guided tutorial to this repo in the associated [Medium Article](https://medium.com/coinmonks/deploying-a-smart-contract-and-selling-nfts-d6215b1da69)
# Install and usage

Add the required keys to a `.env` file (details [here](https://medium.com/coinmonks/deploying-a-smart-contract-and-selling-nfts-d6215b1da69)):
- ALCHEMY_KEY
- PRIVATE_KEY
- MNEMONIC
- ETHERSCAN_API_KEY


Setup
```
npm install
```

Run contract tests
```
npx hardhat test
```

Check test coverage
```
npx hardhat coverage
```

Deploy to the Rinkeby test network
```
npx hardhat deploy --network rinkeby --export-all deployments.json
```

Verify on Etherscan
```
npx hardhat verify <CONTRACT ADDRESS> --network rinkeby
```

# About
This repository is the core framework used by [Spectra.Art](https://spectra.art) to develop, test and deploy smart contracts.

It has been used so far to successfully launch 4 NFT collections:
1. [Eternal Fragments](https://eternal-fragments.spectra.art)
2. [Living Fragments](https://opensea.io/collection/living-fragments)
3. [Vortex](https://vortex.spectra.art)
4. [Chromospheres](https://chromospheres.spectra.art)
