"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";

export default function QueueTimeline({ refreshKey = 0 }) {
  const { account, waitingListContract } = useWeb3();
  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [myPosition, setMyPosition] = useState(null);

  // Obfuscate address for privacy
  const obfuscateAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Fetch full queue
  const fetchQueue = async () => {
    if (!waitingListContract) return;

    setIsLoading(true);
    try {
      const length = await waitingListContract.getQueueLength();
      const queueLength = Number(length);

      const queueData = [];
      for (let i = 0; i < queueLength; i++) {
        const address = await waitingListContract.getQueueAtIndex(i);
        queueData.push({
          position: i + 1,
          address: address,
          isCurrentUser: account && address.toLowerCase() === account.toLowerCase(),
        });
      }

      setQueue(queueData);

      // Find current user position
      if (account) {
        const userIndex = queueData.findIndex((item) => item.isCurrentUser);
        setMyPosition(userIndex >= 0 ? userIndex + 1 : null);
      }
    } catch (err) {
      console.error("Error fetching queue:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and refresh when refreshKey changes
  useEffect(() => {
    if (account && waitingListContract) {
      fetchQueue();
    }
  }, [account, waitingListContract, refreshKey]);

  // Set up event listeners for real-time updates
  useEffect(() => {
    if (!waitingListContract) return;

    const handleUserRegistered = () => {
      console.log("User registered event detected");
      fetchQueue();
    };

    const handleUserRemoved = () => {
      console.log("User removed event detected");
      fetchQueue();
    };

    const handleUserWithdrew = () => {
      console.log("User withdrew event detected");
      fetchQueue();
    };

    // Listen to events
    waitingListContract.on("UserRegistered", handleUserRegistered);
    waitingListContract.on("UserRemoved", handleUserRemoved);
    waitingListContract.on("UserWithdrew", handleUserWithdrew);

    // Cleanup
    return () => {
      waitingListContract.off("UserRegistered", handleUserRegistered);
      waitingListContract.off("UserRemoved", handleUserRemoved);
      waitingListContract.off("UserWithdrew", handleUserWithdrew);
    };
  }, [waitingListContract]);

  if (!account) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">
          group
        </span>
        <p className="text-gray-500 dark:text-gray-400">
          Connect your wallet to view the queue
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Live Queue</h3>
        <button
          onClick={fetchQueue}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#068cf9] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">
            hourglass_empty
          </span>
          <p className="text-gray-500 dark:text-gray-400">The queue is currently empty</p>
        </div>
      ) : (
        <div className="relative max-h-96 overflow-y-auto pr-4">
          {/* Vertical Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-500 via-[#068cf9] to-gray-300 dark:to-gray-600"></div>

          {/* Queue Items */}
          <div className="space-y-6">
            {queue.map((item, index) => (
              <div key={`${item.address}-${index}`} className="relative flex items-start gap-4">
                {/* Position Badge */}
                <div className="flex-shrink-0 z-10">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                      item.position === 1
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-600 ring-4 ring-yellow-100 dark:ring-yellow-900/30"
                        : item.isCurrentUser
                        ? "bg-gradient-to-br from-[#068cf9] to-blue-700 ring-4 ring-blue-200 dark:ring-blue-900/50"
                        : "bg-gray-400 dark:bg-gray-600"
                    }`}
                  >
                    <span className="text-white font-bold text-lg">{item.position}</span>
                  </div>
                </div>

                {/* Address Card */}
                <div
                  className={`flex-grow rounded-lg p-4 ${
                    item.position === 1
                      ? "bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-800 border-2 border-yellow-400 shadow-md"
                      : item.isCurrentUser
                      ? "bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/30 dark:to-gray-800 border-2 border-[#068cf9] shadow-lg"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow"
                  }`}
                >
                  {item.position === 1 && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">
                        emoji_events
                      </span>
                      <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-500 uppercase tracking-wide">
                        Next to be served
                      </span>
                    </div>
                  )}
                  {item.isCurrentUser && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[#068cf9]">person</span>
                      <span className="text-xs font-bold text-[#068cf9] uppercase tracking-wider">
                        Your Position
                      </span>
                    </div>
                  )}
                  <p
                    className={`font-mono ${
                      item.position === 1 || item.isCurrentUser
                        ? "text-lg font-semibold text-gray-900 dark:text-white"
                        : "text-base text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {obfuscateAddress(item.address)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
