"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import ThemeToggle from "@/components/ThemeToggle";
import QueueTimeline from "@/components/QueueTimeline";
import { handleTransactionError } from "@/utils/errorHandler";

export default function Home() {
  const {
    account,
    waitTokenContract,
    tokenSaleContract,
    waitingListContract,
    isCorrectNetwork,
    connectWallet,
    disconnectWallet,
    isConnecting,
  } = useWeb3();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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

  // Token data
  const [tokenBalance, setTokenBalance] = useState("0");
  const [tokenPrice, setTokenPrice] = useState("0");
  const [nextPurchaseAmount, setNextPurchaseAmount] = useState("0");

  // Queue data
  const [isInQueue, setIsInQueue] = useState(false);
  const [myPosition, setMyPosition] = useState(null);
  const [queueLength, setQueueLength] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [queueRefreshKey, setQueueRefreshKey] = useState(0);

  // Load all data
  useEffect(() => {
    if (account && isCorrectNetwork && waitTokenContract && tokenSaleContract && waitingListContract) {
      loadAllData();
    }
  }, [account, isCorrectNetwork, waitTokenContract, tokenSaleContract, waitingListContract]);

  // Listen for queue events to auto-refresh
  useEffect(() => {
    if (!waitingListContract) return;

    const handleQueueChange = () => {
      console.log("Queue event detected, refreshing data...");
      loadAllData();
      setQueueRefreshKey(prev => prev + 1);
    };

    waitingListContract.on("UserRegistered", handleQueueChange);
    waitingListContract.on("UserRemoved", handleQueueChange);
    waitingListContract.on("UserWithdrew", handleQueueChange);

    return () => {
      waitingListContract.off("UserRegistered", handleQueueChange);
      waitingListContract.off("UserRemoved", handleQueueChange);
      waitingListContract.off("UserWithdrew", handleQueueChange);
    };
  }, [waitingListContract]);

  const loadAllData = async (skipPositionCheck = false) => {
    try {
      // Token data
      const [balance, price] = await Promise.all([
        waitTokenContract.balanceOf(account),
        tokenSaleContract.TOKEN_PRICE(),
      ]);
      setTokenBalance(ethers.formatEther(balance));
      setTokenPrice(ethers.formatEther(price));
      const nextAmount = ethers.parseEther("1") + balance;
      setNextPurchaseAmount(ethers.formatEther(nextAmount));

      // Queue data
      const [inQueue, length, owner] = await Promise.all([
        waitingListContract.isInQueue(account),
        waitingListContract.getQueueLength(),
        waitingListContract.owner(),
      ]);
      setIsInQueue(inQueue);
      setQueueLength(Number(length));
      setIsOwner(owner.toLowerCase() === account.toLowerCase());

      // Only fetch position if explicitly requested and user is in queue
      // This avoids console errors from gas estimation on view functions
      if (inQueue && !skipPositionCheck) {
        try {
          const position = await waitingListContract.getMyPosition();
          setMyPosition(Number(position)); // Already 1-indexed from contract
        } catch (err) {
          // Silently handle - position will be null
          setMyPosition(null);
        }
      } else if (!inQueue) {
        setMyPosition(null);
      }
      // If skipPositionCheck is true and inQueue is true, keep existing position
    } catch (err) {
      // Silently handle data loading errors
      console.log("Info: Unable to load some data, will retry on next update");
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
      await loadAllData();
    } catch (err) {
      const errorMessage = await handleTransactionError(err, "buying token");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinQueue = async () => {
    if (!waitingListContract || !waitTokenContract) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const balance = await waitTokenContract.balanceOf(account);
      const cost = await waitingListContract.REGISTRATION_COST();

      if (balance < cost) {
        throw new Error(`Insufficient tokens. You need ${ethers.formatEther(cost)} WAIT tokens.`);
      }

      const approveTx = await waitTokenContract.approve(
        await waitingListContract.getAddress(),
        cost
      );
      setSuccess("Approving tokens... Please wait.");
      await approveTx.wait();

      const joinTx = await waitingListContract.joinQueue();
      setSuccess("Joining queue... Please wait.");
      await joinTx.wait();

      setSuccess("Successfully joined the queue!");
      await loadAllData();
      setQueueRefreshKey(prev => prev + 1); // Trigger QueueTimeline refresh
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
      setSuccess("Successfully left the queue! You received 0.5 WAIT tokens as refund.");
      await loadAllData();
      setQueueRefreshKey(prev => prev + 1); // Trigger QueueTimeline refresh
    } catch (err) {
      const errorMessage = await handleTransactionError(err, "leaving queue");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
      setSuccess("Successfully removed first user from queue!");
      await loadAllData();
      setQueueRefreshKey(prev => prev + 1); // Trigger QueueTimeline refresh
    } catch (err) {
      const errorMessage = await handleTransactionError(err, "removing first user");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f7f8] dark:bg-[#0f1a23] text-gray-800 dark:text-gray-200">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#f5f7f8]/80 dark:bg-[#0f1a23]/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 text-[#068cf9]">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z"
                    fill="currentColor"
                  ></path>
                  <path
                    clipRule="evenodd"
                    d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z"
                    fill="currentColor"
                    fillRule="evenodd"
                  ></path>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">TokenQueue</h1>
            </div>

            {/* Theme Toggle & Wallet Connect */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

              {!account ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="bg-[#068cf9] hover:bg-[#068cf9]/90 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono">{formatAddress(account)}</span>
                  <button
                    onClick={disconnectWallet}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
              {account ? "Waiting List Queue" : "Decentralized Waiting List System"}
            </h2>
            <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
              {account && isCorrectNetwork && isInQueue && myPosition
                ? `You are position #${myPosition} out of ${queueLength} users`
                : account && isCorrectNetwork
                ? `Queue has ${queueLength} users`
                : "Connect your wallet to get started"}
            </p>
          </div>

          {/* Wrong Network Warning */}
          {account && !isCorrectNetwork && (
            <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded-lg mb-6">
              <p className="font-semibold">Wrong Network!</p>
              <p className="text-sm">Please switch to Hardhat Local (Chain ID: 31337)</p>
            </div>
          )}

          {/* Main Content */}
          {account && isCorrectNetwork && (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your Balance</p>
                  <p className="text-2xl font-bold text-[#068cf9] mt-1">{tokenBalance} WAIT</p>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Position</p>
                  <p className="text-2xl font-bold text-[#068cf9] mt-1">
                    {isInQueue && myPosition ? `#${myPosition}` : "—"}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Queue Length</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{queueLength}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Next Purchase</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{nextPurchaseAmount} WAIT</p>
                </div>
              </div>

              {/* Queue Timeline */}
              <div className="mb-6">
                <QueueTimeline refreshKey={queueRefreshKey} />
              </div>

              {/* Messages */}
              {error && (
                <div className="px-4 py-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300 mb-6 flex items-start justify-between gap-3">
                  <span className="flex-1">{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="flex-shrink-0 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {success && (
                <div className="px-4 py-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-300 mb-6 flex items-start justify-between gap-3">
                  <span className="flex-1">{success}</span>
                  <button
                    onClick={() => setSuccess(null)}
                    className="flex-shrink-0 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <button
                  onClick={handleBuyToken}
                  disabled={isLoading}
                  className="flex justify-center items-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-white bg-[#068cf9] hover:bg-[#068cf9]/90 shadow-lg transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">shopping_cart</span>
                  {isLoading ? "Processing..." : `Buy ${nextPurchaseAmount} WAIT`}
                </button>

                {!isInQueue ? (
                  <button
                    onClick={handleJoinQueue}
                    disabled={isLoading || parseFloat(tokenBalance) < 1}
                    className="flex justify-center items-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-lg transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">group_add</span>
                    Join Queue (1 WAIT)
                  </button>
                ) : (
                  <button
                    onClick={handleLeaveQueue}
                    disabled={isLoading}
                    className="flex justify-center items-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-lg transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">logout</span>
                    Leave Queue (0.5 WAIT)
                  </button>
                )}

                {/* Placeholder for grid alignment when not in queue */}
                {!isInQueue && <div className="hidden lg:block"></div>}
              </div>

              {/* Admin Panel */}
              {isOwner && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-6 shadow-lg mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-2xl text-yellow-600 dark:text-yellow-400">
                      admin_panel_settings
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Admin Panel</h3>
                  </div>
                  <button
                    onClick={handleRemoveFirst}
                    disabled={isLoading || queueLength === 0}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-white bg-gray-700 hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">person_remove</span>
                    Remove First User from Queue
                  </button>
                </div>
              )}

              {/* Info Box */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                💡 <strong>Bonus System:</strong> Each purchase gives you 1 + your current balance in tokens!
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
