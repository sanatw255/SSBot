const mongoose = require("mongoose");
const chalk = require("chalk");

async function connect() {
  mongoose.set("strictQuery", false);

  const options = {
    serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 2, // Maintain at least 2 socket connections
    connectTimeoutMS: 10000, // Give up initial connection after 10s
    heartbeatFrequencyMS: 10000, // Check server health every 10s
  };

  try {
    console.log(
      chalk.blue(chalk.bold(`Database`)),
      chalk.white(`>>`),
      chalk.red(`MongoDB`),
      chalk.green(`is connecting...`)
    );
    await mongoose.connect(process.env.MONGO_TOKEN, options);
  } catch (err) {
    console.log(
      chalk.red(`[ERROR]`),
      chalk.white(`>>`),
      chalk.red(`MongoDB`),
      chalk.white(`>>`),
      chalk.red(`Failed to connect to MongoDB!`),
      chalk.white(`>>`),
      chalk.red(`Error: ${err}`)
    );
    console.log(chalk.red("Retrying in 5 seconds..."));
    setTimeout(() => connect(), 5000);
    return;
  }

  mongoose.connection.once("open", () => {
    console.log(
      chalk.blue(chalk.bold(`Database`)),
      chalk.white(`>>`),
      chalk.red(`MongoDB`),
      chalk.green(`is ready!`)
    );
  });

  mongoose.connection.on("error", (err) => {
    console.log(
      chalk.red(`[ERROR]`),
      chalk.white(`>>`),
      chalk.red(`Database`),
      chalk.white(`>>`),
      chalk.red(`MongoDB connection error!`),
      chalk.white(`>>`),
      chalk.red(`Error: ${err.message}`)
    );
    // Don't exit, let Mongoose handle reconnection
  });

  mongoose.connection.on("disconnected", () => {
    console.log(
      chalk.yellow(`[WARNING]`),
      chalk.white(`>>`),
      chalk.yellow(`MongoDB disconnected! Attempting to reconnect...`)
    );
  });

  mongoose.connection.on("reconnected", () => {
    console.log(
      chalk.green(`[SUCCESS]`),
      chalk.white(`>>`),
      chalk.green(`MongoDB reconnected successfully!`)
    );
  });

  return;
}

module.exports = connect;
