const { ethers } = require("hardhat");

/**
 * Utility script to manually advance time in Hardhat network
 * Usage: docker-compose exec hardhat npx hardhat run scripts/advance-time.js --network localhost
 *
 * This script is useful for testing time-dependent functionality like auction endings
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  // Default to 1 hour if no argument provided
  let secondsToAdvance = 3600;

  // Check if user provided a time argument
  if (args.length > 0 && !isNaN(args[0])) {
    secondsToAdvance = parseInt(args[0]);
  }

  console.log(`\nAdvancing time by ${secondsToAdvance} seconds (${Math.floor(secondsToAdvance / 60)} minutes)...`);

  // Get current block timestamp
  const blockBefore = await ethers.provider.getBlock('latest');
  console.log(`Current block timestamp: ${blockBefore.timestamp}`);
  console.log(`Current block number: ${blockBefore.number}`);

  // Advance time
  await ethers.provider.send("evm_increaseTime", [secondsToAdvance]);

  // Mine a new block to apply the time change
  await ethers.provider.send("evm_mine", []);

  // Get new block timestamp
  const blockAfter = await ethers.provider.getBlock('latest');
  console.log(`\nNew block timestamp: ${blockAfter.timestamp}`);
  console.log(`New block number: ${blockAfter.number}`);
  console.log(`Time advanced: ${blockAfter.timestamp - blockBefore.timestamp} seconds`);

  console.log("\n✓ Time advancement complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
