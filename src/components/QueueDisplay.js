"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";

export default function QueueDisplay() {
  const { account, waitingListContract, isCorrectNetwork } = useWeb3();
  const [queue, setQueue] = useState([]);
  const [queueLength, setQueueLength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (waitingListContract && isCorrectNetwork) {
      loadQueue();

      // Listen for queue events to auto-refresh
      const handleUserRegistered = () => loadQueue();
      const handleUserRemoved = () => loadQueue();
      const handleUserWithdrew = () => loadQueue();

      waitingListContract.on("UserRegistered", handleUserRegistered);
      waitingListContract.on("UserRemoved", handleUserRemoved);
      waitingListContract.on("UserWithdrew", handleUserWithdrew);

      return () => {
        waitingListContract.off("UserRegistered", handleUserRegistered);
        waitingListContract.off("UserRemoved", handleUserRemoved);
        waitingListContract.off("UserWithdrew", handleUserWithdrew);
      };
    }
  }, [waitingListContract, isCorrectNetwork]);

  const loadQueue = async () => {
    if (!waitingListContract) return;

    setIsLoading(true);
    try {
      const length = await waitingListContract.getQueueLength();
      setQueueLength(Number(length));

      // Load all addresses in queue
      const addresses = [];
      for (let i = 0; i < Number(length); i++) {
        const address = await waitingListContract.getQueueAtIndex(i);
        addresses.push(address);
      }
      setQueue(addresses);
    } catch (err) {
      console.error("Error loading queue:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isCorrectNetwork) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">Current Queue</h2>
        <p className="text-yellow-600 dark:text-yellow-400">Please switch to the correct network</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Current Queue</h2>
        <button
          onClick={loadQueue}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
        <span className="text-sm text-gray-600 dark:text-gray-400">Total in Queue: </span>
        <span className="font-bold text-blue-600 dark:text-blue-400">{queueLength}</span>
      </div>

      {queueLength === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Queue is empty
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {queue.map((address, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded ${
                account && address.toLowerCase() === account.toLowerCase()
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700"
                  : "bg-gray-50 dark:bg-gray-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-600 dark:text-gray-400 w-8">
                  #{index + 1}
                </span>
                <span className="font-mono text-sm">
                  {formatAddress(address)}
                </span>
                {account && address.toLowerCase() === account.toLowerCase() && (
                  <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                    You
                  </span>
                )}
              </div>
              {index === 0 && (
                <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                  Next
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
