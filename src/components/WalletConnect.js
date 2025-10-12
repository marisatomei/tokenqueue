"use client";

import { useWeb3 } from "@/contexts/Web3Context";

export default function WalletConnect() {
  const { account, isConnecting, error, connectWallet, disconnectWallet, isCorrectNetwork, chainId } = useWeb3();

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (account) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="font-mono text-sm">{formatAddress(account)}</span>
          <button
            onClick={disconnectWallet}
            className="ml-2 px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
          >
            Disconnect
          </button>
        </div>
        {!isCorrectNetwork && (
          <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm">
            ⚠️ Wrong network! Please switch to Hardhat Local (Chain ID: 31337)
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
