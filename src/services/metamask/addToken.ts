import { GOERLI_DK_STABLETOKEN_ADDRESS } from "@/blockchain/contract-addresses";
import { stable_coin_symbol } from "@/config";

interface CustomWindow extends Window {
  ethereum?: any;
}

export const AddUSDCTokenToWallet = async () => {
  const customWindow = window as CustomWindow;
  const ethereum = customWindow.ethereum;

  const response = {
    message: `${stable_coin_symbol} Token`,
    error: "Something went wrong.",
  };

  if (ethereum && ethereum.isMetaMask) {
    await ethereum
      .request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: GOERLI_DK_STABLETOKEN_ADDRESS,
            symbol: stable_coin_symbol,
            decimals: 18,
            image:
              "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
          },
        },
      })
      .then((success) => {
        if (success) {
          response.error = "";
        } else {
          response.message = "";
          throw new Error("Something went wrong.");
        }
      })
      .catch((error) => {
        response.message = "";
        console.error(error);
      });
  } else {
    console.error("Please install MetaMask!");
  }

  return response;
};

export const AddDefiDollarsTokenToWallet = async () => {
  const customWindow = window as CustomWindow;
  const ethereum = customWindow.ethereum;

  const response = {
    message: "DefiDollars Token",
    error: "Something went wrong.",
  };

  if (ethereum && ethereum.isMetaMask) {
    await ethereum
      .request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: "0x34bFb9AEb5eDb1Cc9A59952534708cA6A2F5dc53",
            symbol: "DD",
            decimals: 18,
            image:
              "https://storage.googleapis.com/defikids_bucket/token-logo.svg",
          },
        },
      })
      .then((success) => {
        if (success) {
          response.error = "";
        } else {
          response.message = "";
          throw new Error("Something went wrong.");
        }
      })
      .catch((error) => {
        response.message = "";
        console.error(error);
      });
  } else {
    console.error("Please install MetaMask!");
  }

  return response;
};
