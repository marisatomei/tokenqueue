"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";

export default function AdminPanel() {
  const { account, waitingListContract, isCorrectNetwork } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

  useEffect(() => {
    if (account && waitingListContract && isCorrectNetwork) {
      checkOwnership();
      loadQueueLength();
    }
  }, [account, waitingListContract, isCorrectNetwork]);

  const checkOwnership = async () => {
    try {
      const owner = await waitingListContract.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());
    } catch (err) {
      console.error("Error checking ownership:", err);
    }
  };

  const loadQueueLength = async () => {
    try {
      const length = await waitingListContract.getQueueLength();
      setQueueLength(Number(length));
    } catch (err) {
      console.error("Error loading queue length:", err);
    }
  };

  const handleRemoveFirst = async () => {
    if (!waitingListContract) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tx = await waitingListContract.removeFirst();
      setSuccess("Removing first user... Please wait.");
      await tx.wait();

      setSuccess("Successfully removed first user from queue! They received a full refund.");
      await loadQueueLength(); // Refresh queue length
    } catch (err) {
      console.error("Error removing first user:", err);
      setError(err.reason || err.message || "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!account) {
    return null; // Don't show admin panel if not connected
  }

  if (!isCorrectNetwork) {
    return null; // Don't show if wrong network
  }

  if (!isOwner) {
    return null; // Don't show if not owner
  }

  return (
    <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-lg border-2 border-purple-300 dark:border-purple-700">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">👑</span>
        <h2 className="text-xl font-bold">Admin Panel</h2>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded">
          <span className="text-sm text-gray-600 dark:text-gray-400">Queue Length</span>
          <span className="font-mono font-bold">{queueLength}</span>
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-400 p-3 bg-white dark:bg-gray-800 rounded">
          💡 Remove First: Removes the first person in queue and refunds them 1 WAIT token (full registration cost)
        </div>
      </div>

      <button
        onClick={handleRemoveFirst}
        disabled={isLoading || queueLength === 0}
        className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {isLoading ? "Processing..." : queueLength === 0 ? "Queue is Empty" : "Remove First User"}
      </button>

      {error && (
        <div className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 px-4 py-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-300">
          {success}
        </div>
      )}
    </div>
  );
}
