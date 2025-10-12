#!/usr/bin/env node

/**
 * Cross-platform sleep utility
 * Usage: node scripts/sleep.js <seconds>
 */

const seconds = parseInt(process.argv[2], 10);

if (!seconds || seconds <= 0) {
  console.error('Usage: node scripts/sleep.js <seconds>');
  process.exit(1);
}

console.log(`Waiting ${seconds} seconds for services to start...`);

setTimeout(() => {
  console.log('Ready!');
  process.exit(0);
}, seconds * 1000);
