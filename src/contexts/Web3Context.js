"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import detectEthereumProvider from "@metamask/detect-provider";
import { CONTRACTS, NETWORK_CONFIG } from "@/constants/config";
import { WAIT_TOKEN_ABI, TOKEN_SALE_ABI, WAITING_LIST_ABI } from "@/utils/abis";
// Import console filter to suppress expected ethers.js gas estimation errors
import "@/utils/consoleFilter";

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Contract instances
  const [waitTokenContract, setWaitTokenContract] = useState(null);
  const [tokenSaleContract, setTokenSaleContract] = useState(null);
  const [waitingListContract, setWaitingListContract] = useState(null);

  // Initialize provider
  useEffect(() => {
    const init = async () => {
      const ethereum = await detectEthereumProvider();
      if (ethereum) {
        const ethersProvider = new ethers.BrowserProvider(ethereum);
        setProvider(ethersProvider);

        // Get initial account and chain
        const accounts = await ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          await handleAccountsChanged(accounts, ethersProvider);
        }

        const chain = await ethereum.request({ method: "eth_chainId" });
        setChainId(parseInt(chain, 16));

        // Set up event listeners
        ethereum.on("accountsChanged", (accounts) => handleAccountsChanged(accounts, ethersProvider));
        ethereum.on("chainChanged", (chain) => {
          setChainId(parseInt(chain, 16));
          window.location.reload(); // Recommended by MetaMask
        });
      } else {
        setError("Please install MetaMask");
      }
    };

    init();
  }, []);

  const handleAccountsChanged = async (accounts, ethersProvider) => {
    if (accounts.length === 0) {
      setAccount(null);
      setSigner(null);
      setWaitTokenContract(null);
      setTokenSaleContract(null);
      setWaitingListContract(null);
    } else {
      const newSigner = await ethersProvider.getSigner();
      setAccount(accounts[0]);
      setSigner(newSigner);

      // Initialize contracts
      const waitToken = new ethers.Contract(CONTRACTS.waitToken.address, WAIT_TOKEN_ABI, newSigner);
      const tokenSale = new ethers.Contract(CONTRACTS.tokenSale.address, TOKEN_SALE_ABI, newSigner);
      const waitingList = new ethers.Contract(CONTRACTS.waitingList.address, WAITING_LIST_ABI, newSigner);

      setWaitTokenContract(waitToken);
      setTokenSaleContract(tokenSale);
      setWaitingListContract(waitingList);
    }
  };

  const connectWallet = async () => {
    if (!provider) {
      setError("Please install MetaMask");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ethereum = window.ethereum;

      // Request account access
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      // Check if we're on the correct network
      const chain = await ethereum.request({ method: "eth_chainId" });
      const currentChainId = parseInt(chain, 16);

      if (currentChainId !== NETWORK_CONFIG.chainId) {
        // Try to switch to the correct network
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
          });
        } catch (switchError) {
          // If the chain hasn't been added to MetaMask
          if (switchError.code === 4902) {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
                  chainName: "Hardhat Local",
                  nativeCurrency: {
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: [NETWORK_CONFIG.rpcUrl],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      await handleAccountsChanged(accounts, provider);
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setWaitTokenContract(null);
    setTokenSaleContract(null);
    setWaitingListContract(null);
  };

  const value = {
    provider,
    signer,
    account,
    chainId,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    waitTokenContract,
    tokenSaleContract,
    waitingListContract,
    isCorrectNetwork: chainId === NETWORK_CONFIG.chainId,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
