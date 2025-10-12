"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { handleTransactionError } from "@/utils/errorHandler";

export default function QueueManagement() {
  const { account, waitingListContract, waitTokenContract, isCorrectNetwork } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isInQueue, setIsInQueue] = useState(false);
  const [myPosition, setMyPosition] = useState(null);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [registrationCost, setRegistrationCost] = useState("0");
  const [withdrawalRefund, setWithdrawalRefund] = useState("0");

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
    if (account && waitingListContract && waitTokenContract && isCorrectNetwork) {
      loadData();
    }
  }, [account, waitingListContract, waitTokenContract, isCorrectNetwork]);

  const loadData = async () => {
    try {
      const [inQueue, balance, regCost, wdRefund] = await Promise.all([
        waitingListContract.isInQueue(account),
        waitTokenContract.balanceOf(account),
        waitingListContract.REGISTRATION_COST(),
        waitingListContract.WITHDRAWAL_REFUND(),
      ]);

      setIsInQueue(inQueue);
      setTokenBalance(ethers.formatEther(balance));
      setRegistrationCost(ethers.formatEther(regCost));
      setWithdrawalRefund(ethers.formatEther(wdRefund));

      // Only try to get position if user is in queue
      if (inQueue) {
        try {
          // Double-check to prevent race conditions
          const stillInQueue = await waitingListContract.isInQueue(account);
          if (stillInQueue) {
            const position = await waitingListContract.getMyPosition();
            setMyPosition(Number(position)); // Already 1-indexed from contract
          } else {
            setMyPosition(null);
          }
        } catch (err) {
          // Silently handle expected errors
          setMyPosition(null);
        }
      } else {
        setMyPosition(null);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const handleJoinQueue = async () => {
    if (!waitingListContract || !waitTokenContract) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if user has enough tokens
      const balance = await waitTokenContract.balanceOf(account);
      const cost = await waitingListContract.REGISTRATION_COST();

      if (balance < cost) {
        throw new Error(`Insufficient tokens. You need ${ethers.formatEther(cost)} WAIT tokens.`);
      }

      // First approve the contract to spend tokens
      const approveTx = await waitTokenContract.approve(
        await waitingListContract.getAddress(),
        cost
      );
      setSuccess("Approving tokens... Please wait.");
      await approveTx.wait();

      // Then join the queue
      const joinTx = await waitingListContract.joinQueue();
      setSuccess("Joining queue... Please wait.");
      await joinTx.wait();

      setSuccess("Successfully joined the queue!");
      await loadData(); // Refresh data
    } catch (err) {
      const errorMessage = await handleTransactionError(err, "joining queue");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!waitingListContract) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tx = await waitingListContract.leaveQueue();
      setSuccess("Leaving queue... Please wait.");
      await tx.wait();

      setSuccess(`Successfully left the queue! You received ${withdrawalRefund} WAIT tokens as refund.`);
      await loadData(); // Refresh data
    } catch (err) {
      const errorMessage = await handleTransactionError(err, "leaving queue");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">Queue Management</h2>
        <p className="text-gray-600 dark:text-gray-400">Connect your wallet to manage queue</p>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">Queue Management</h2>
        <p className="text-yellow-600 dark:text-yellow-400">Please switch to the correct network</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold mb-4">Queue Management</h2>

      <div className="mb-6 space-y-3">
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
          <span className="text-sm text-gray-600 dark:text-gray-400">Your Balance</span>
          <span className="font-mono font-bold">{tokenBalance} WAIT</span>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
          <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
          <span className={`font-bold ${isInQueue ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`}>
            {isInQueue ? "In Queue" : "Not in Queue"}
          </span>
        </div>

        {isInQueue && myPosition !== null && (
          <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <span className="text-sm text-gray-600 dark:text-gray-400">Your Position</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              #{myPosition}
            </span>
          </div>
        )}

        {!isInQueue && (
          <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-900 rounded">
            💡 Cost: {registrationCost} WAIT | Refund on voluntary leave: {withdrawalRefund} WAIT
          </div>
        )}
      </div>

      {!isInQueue ? (
        <button
          onClick={handleJoinQueue}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          {isLoading ? "Processing..." : `Join Queue (${registrationCost} WAIT)`}
        </button>
      ) : (
        <button
          onClick={handleLeaveQueue}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          {isLoading ? "Processing..." : `Leave Queue (Get ${withdrawalRefund} WAIT back)`}
        </button>
      )}

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
