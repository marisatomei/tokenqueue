import { ErrorDecoder } from 'ethers-decode-error';
import { ethers } from 'ethers';

// Import ABIs for error decoding
import { WAIT_TOKEN_ABI, TOKEN_SALE_ABI, WAITING_LIST_ABI } from './abis';

// Parse JSON string ABIs
const waitTokenAbi = JSON.parse(WAIT_TOKEN_ABI);
const tokenSaleAbi = JSON.parse(TOKEN_SALE_ABI);
const waitingListAbi = JSON.parse(WAITING_LIST_ABI);

// Initialize error decoder with contract ABIs
const errorDecoder = ErrorDecoder.create([
  waitTokenAbi,
  tokenSaleAbi,
  waitingListAbi,
]);

/**
 * Decode and format contract errors for user display
 * @param {Error} error - The error object from ethers
 * @returns {string} - User-friendly error message
 */
export async function decodeContractError(error) {
  try {
    // Try to decode the error using ethers-decode-error
    const decodedError = await errorDecoder.decode(error);

    // Format the decoded error
    if (decodedError.reason) {
      // Custom contract error with reason
      return decodedError.reason;
    } else if (decodedError.name) {
      // Named error (e.g., custom errors in Solidity)
      return `${decodedError.name}: ${decodedError.args?.join(', ') || 'Transaction failed'}`;
    }

    return decodedError.toString();
  } catch (decodeErr) {
    // If decoding fails, extract error info manually
    console.error('Error decoding failed:', decodeErr);
    return extractErrorMessage(error);
  }
}

/**
 * Extract error message from various error formats
 * @param {Error} error - The error object
 * @returns {string} - Extracted error message
 */
function extractErrorMessage(error) {
  // Handle different error structures

  // 1. Check for revert reason
  if (error.revert?.args?.[0]) {
    return error.revert.args[0];
  }

  // 2. Check for reason property
  if (error.reason) {
    // Clean up common error prefixes
    let reason = error.reason;
    if (reason.includes('execution reverted:')) {
      reason = reason.split('execution reverted:')[1].trim();
    }
    return reason.replace(/^["']|["']$/g, ''); // Remove quotes
  }

  // 3. Check for error.error.data.message (MetaMask format)
  if (error.error?.data?.message) {
    return error.error.data.message;
  }

  // 4. Check for shortMessage
  if (error.shortMessage) {
    return error.shortMessage;
  }

  // 5. Check error message
  if (error.message) {
    // Try to extract revert reason from message
    const revertMatch = error.message.match(/execution reverted: "([^"]+)"/);
    if (revertMatch) {
      return revertMatch[1];
    }

    const revertMatch2 = error.message.match(/reverted with reason string '([^']+)'/);
    if (revertMatch2) {
      return revertMatch2[1];
    }

    // Handle common error types
    if (error.message.includes('user rejected')) {
      return 'Transaction rejected by user';
    }

    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }

    // Return cleaned message
    return error.message;
  }

  // 6. Check error code
  if (error.code) {
    const codeMessages = {
      'ACTION_REJECTED': 'Transaction rejected by user',
      'INSUFFICIENT_FUNDS': 'Insufficient funds for transaction',
      'UNPREDICTABLE_GAS_LIMIT': 'Cannot estimate gas - transaction may fail',
      'CALL_EXCEPTION': 'Contract execution failed',
      'NETWORK_ERROR': 'Network error - please check your connection',
    };

    if (codeMessages[error.code]) {
      return codeMessages[error.code];
    }
  }

  // 7. Default fallback
  return 'Transaction failed. Please try again.';
}

/**
 * Format error for display with detailed info in console
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred (e.g., "joining queue")
 * @returns {Promise<string>} - Formatted error message
 */
export async function handleTransactionError(error, context = 'transaction') {
  console.error(`Error ${context}:`, error);

  const errorMessage = await decodeContractError(error);

  return errorMessage;
}

/**
 * Check if error is user rejection
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export function isUserRejection(error) {
  return (
    error.code === 'ACTION_REJECTED' ||
    error.code === 4001 ||
    error.message?.includes('user rejected') ||
    error.message?.includes('User denied')
  );
}
