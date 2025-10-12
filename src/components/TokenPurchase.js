"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { handleTransactionError } from "@/utils/errorHandler";

export default function TokenPurchase() {
  const { account, tokenSaleContract, waitTokenContract, isCorrectNetwork } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [tokenPrice, setTokenPrice] = useState("0");
  const [nextPurchaseAmount, setNextPurchaseAmount] = useState("0");

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (account && waitTokenContract && tokenSaleContract && isCorrectNetwork) {
      loadData();
    }
  }, [account, waitTokenContract, tokenSaleContract, isCorrectNetwork]);

  const loadData = async () => {
    try {
      const [balance, price] = await Promise.all([
        waitTokenContract.balanceOf(account),
        tokenSaleContract.TOKEN_PRICE(),
      ]);

      setTokenBalance(ethers.formatEther(balance));
      setTokenPrice(ethers.formatEther(price));

      // Calculate next purchase amount (1 + current balance)
      const nextAmount = ethers.parseEther("1") + balance;
      setNextPurchaseAmount(ethers.formatEther(nextAmount));
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const handleBuyToken = async () => {
    if (!tokenSaleContract) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const price = await tokenSaleContract.TOKEN_PRICE();
      const tx = await tokenSaleContract.buyToken({ value: price });

      setSuccess("Transaction submitted! Waiting for confirmation...");
      await tx.wait();

      setSuccess(`Successfully purchased ${nextPurchaseAmount} WAIT tokens!`);
      await loadData(); // Refresh data
    } catch (err) {
      const errorMessage = await handleTransactionError(err, "buying token");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">Purchase WAIT Tokens</h2>
        <p className="text-gray-600 dark:text-gray-400">Connect your wallet to purchase tokens</p>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">Purchase WAIT Tokens</h2>
        <p className="text-yellow-600 dark:text-yellow-400">Please switch to the correct network</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold mb-4">Purchase WAIT Tokens</h2>

      <div className="mb-6 space-y-3">
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
          <span className="text-sm text-gray-600 dark:text-gray-400">Your Balance</span>
          <span className="font-mono font-bold">{tokenBalance} WAIT</span>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
          <span className="text-sm text-gray-600 dark:text-gray-400">Token Price</span>
          <span className="font-mono font-bold">{tokenPrice} tBNB</span>
        </div>

        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
          <span className="text-sm text-gray-600 dark:text-gray-400">Next Purchase</span>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
            {nextPurchaseAmount} WAIT
          </span>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-900 rounded">
          💡 Bonus System: You receive 1 + your current balance in tokens!
        </div>
      </div>

      <button
        onClick={handleBuyToken}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {isLoading ? "Processing..." : `Buy ${nextPurchaseAmount} WAIT for ${tokenPrice} tBNB`}
      </button>

      {error && (
        <div className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-start justify-between gap-3">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="flex-shrink-0 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="mt-4 px-4 py-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-300 flex items-start justify-between gap-3">
          <span className="flex-1">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="flex-shrink-0 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
