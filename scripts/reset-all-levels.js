require("dotenv").config();
const mongoose = require("mongoose");
const levels = require("../src/database/models/levels");

// Connect to your database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_TOKEN, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
}

async function resetAllLevels() {
  if (!process.env.MONGO_TOKEN) {
    console.error("MONGO_TOKEN not found in environment variables");
    process.exit(1);
  }

  // Connect to database first
  await connectDB();
  console.log("Resetting all user levels and XP to 0...");

  try {
    // Update all documents in the 'levels' collection
    const result = await levels.updateMany(
      {},
      { 
        $set: { 
          xp: 0, 
          level: 0,
          XP: 0, // In case of older/alternative schemas
          Level: 0
        } 
      }
    );

    console.log(`✅ Successfully reset levels for ${result.modifiedCount} users!`);
  } catch (error) {
    console.error("Error resetting levels:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

resetAllLevels();
