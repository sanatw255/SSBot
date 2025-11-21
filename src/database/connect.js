const mongoose = require("mongoose");
const chalk = require("chalk");

let retryCount = 0;
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 5000; // 5 seconds

async function connect() {
  mongoose.set("strictQuery", false);

  const options = {
    serverSelectionTimeoutMS: 15000, // Increased timeout for better reliability
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 2, // Maintain at least 2 socket connections
    connectTimeoutMS: 15000, // Increased initial connection timeout
    heartbeatFrequencyMS: 10000, // Check server health every 10s
  };

  try {
    console.log(
      chalk.blue(chalk.bold(`Database`)),
      chalk.white(`>>`),
      chalk.red(`MongoDB`),
      chalk.green(`is connecting...`),
      retryCount > 0 ? chalk.yellow(`(Retry ${retryCount}/${MAX_RETRIES})`) : ""
    );

    await mongoose.connect(process.env.MONGO_TOKEN, options);

    // Reset retry count on successful connection
    retryCount = 0;
  } catch (err) {
    retryCount++;

    console.log(
      chalk.red(`[ERROR]`),
      chalk.white(`>>`),
      chalk.red(`MongoDB Connection Failed!`)
    );
    console.log(chalk.yellow(`Reason:`), chalk.white(err.message || err));

    if (retryCount < MAX_RETRIES) {
      // Exponential backoff: 5s, 10s, 20s, 40s, 80s
      const retryDelay = BASE_RETRY_DELAY * Math.pow(2, retryCount - 1);
      console.log(
        chalk.yellow(`⏳ Retrying in ${retryDelay / 1000} seconds...`),
        chalk.dim(`(Attempt ${retryCount}/${MAX_RETRIES})`)
      );
      setTimeout(() => connect(), retryDelay);
    } else {
      console.log(
        chalk.red.bold(
          `\n❌ Failed to connect to MongoDB after ${MAX_RETRIES} attempts.`
        )
      );
      console.log(
        chalk.yellow(
          `⚠️  Bot will continue running with limited functionality.`
        )
      );
      console.log(chalk.cyan(`\nPossible solutions:`));
      console.log(chalk.white(`  1. Check if MongoDB server is running`));
      console.log(chalk.white(`  2. Verify MONGO_TOKEN in your .env file`));
      console.log(chalk.white(`  3. Check network/firewall settings`));
      console.log(
        chalk.white(`  4. Ensure MongoDB allows connections from your IP\n`)
      );

      // Reset retry count for future attempts
      retryCount = 0;
    }
    return;
  }

  mongoose.connection.once("open", () => {
    console.log(
      chalk.green(`✓`),
      chalk.blue(chalk.bold(`Database`)),
      chalk.white(`>>`),
      chalk.red(`MongoDB`),
      chalk.green.bold(`is ready!`)
    );
  });

  mongoose.connection.on("error", (err) => {
    console.log(
      chalk.red(`[ERROR]`),
      chalk.white(`>>`),
      chalk.red(`MongoDB runtime error:`),
      chalk.white(err.message || err)
    );

    // Critical errors that might need attention
    if (
      err.name === "MongoNetworkError" ||
      err.name === "MongoServerSelectionError"
    ) {
      console.log(
        chalk.yellow(
          `⚠️  Network connectivity issue detected. Bot features may be limited.`
        )
      );
    }
  });

  mongoose.connection.on("disconnected", () => {
    console.log(
      chalk.yellow(`[WARNING]`),
      chalk.white(`>>`),
      chalk.yellow(
        `MongoDB disconnected! Will attempt to reconnect automatically...`
      )
    );
  });

  mongoose.connection.on("reconnected", () => {
    console.log(chalk.green.bold(`✓ MongoDB reconnected successfully!`));
    // Reset retry count on successful reconnection
    retryCount = 0;
  });

  // Additional event for monitoring connection state
  mongoose.connection.on("close", () => {
    console.log(chalk.dim(`MongoDB connection closed.`));
  });

  return;
}

// Export connection state checker
function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = connect;
module.exports.isConnected = isConnected;

module.exports = connect;
