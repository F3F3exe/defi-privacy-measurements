-> "whats_in_your_wallet_crawls" folder contains the crawls from the 78 dapps (without debug stuff)

-> "request-logger" is where the modified crawler is


















# DeFi Privacy Measurements

This repository contains the code and data that we developed as part of our
research project on privacy and security issues in decentralized finance (DeFi).
You can find our [technical report on arXiv.org](https://arxiv.org/abs/2109.06836).

The following list explains the purpose of each directory in this repository.

## Code

* [request-logger/](request-logger): A
  [Puppeteer](https://github.com/puppeteer/puppeteer)-based crawler that takes
  as input a list of URLs that are visited one after another while logging all
  requests that the respective sites make.
* [metamask-patch/](metamask-patch): A proof-of-concept patch for the
  [MetaMask](https://github.com/MetaMask/metamask-extension) wallet which
  replaces the user's real Ethereum address with derived, site-specific
  addresses, to make it harder for DeFi sites and trackers to track the user
  across sites.
* [analysis-scripts/](analysis-scripts): A set of Python scripts that analyze
  the data produced by the request-logger.

## Data

* [data/](data): A set of JSON files that we collected with the help of the
  request-logger.
  
## Run wallet extensions

* Download wallets
* Run each wallet via the follwing command and replace EXTENSION_ID with id within the data/wallet_extensions.txt file:

```node run --interactive -w ../data/wallets/EXTENSION_ID --debug verbose -l 10 -d ../results/extensions/crawl -p ../results/extensions/profiles/EXTENSION_ID```

* Get actual EXTENSION_ID from the actual installation by clicking on 'details' and enter it in the command line when promted
* Enter the password that you used during the setup of the wallet
* Enter the finall wallet address that was generated
* Now the script will automatically click on 10 elements in the wallet and close
* Repeat with the remaining wallets
