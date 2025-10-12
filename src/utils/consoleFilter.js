/**
 * Filter console errors to suppress expected ethers.js gas estimation errors
 * while still showing important errors to developers
 */

// Store original console.error
const originalConsoleError = console.error;

// List of error patterns to suppress (expected errors during normal operation)
const suppressPatterns = [
  /execution reverted.*Not in queue/i,
  /WaitingList: Not in queue/i,
  /action="estimateGas"/i,
];

// Override console.error
console.error = (...args) => {
  // Convert all arguments to string for pattern matching
  const errorMessage = args.map(arg => {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return arg.message;
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }).join(' ');

  // Check if this error matches any suppression patterns
  const shouldSuppress = suppressPatterns.some(pattern =>
    pattern.test(errorMessage)
  );

  // If not suppressed, log it normally
  if (!shouldSuppress) {
    originalConsoleError.apply(console, args);
  }
  // Otherwise, silently ignore expected errors
};

export default function initConsoleFilter() {
  // Function is called to initialize the filter
  // The actual override happens when this module is imported
}
