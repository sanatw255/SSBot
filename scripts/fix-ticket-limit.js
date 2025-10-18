require("dotenv").config()
const mongoose = require("mongoose")
const ticketChannels = require("../src/database/models/ticketChannels")

async function fixTicketLimit() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_TOKEN)
    console.log("Connected to database")

    // Find and delete orphaned ticket records (where channel doesn't exist)
    const result = await ticketChannels.deleteMany({
      resolved: false,
      // You can add your user ID here if you want to target specific user
      // creator: 'YOUR_USER_ID_HERE'
    })

    console.log(`Deleted ${result.deletedCount} orphaned ticket records`)

    // Or if you want to just mark them as resolved instead of deleting:
    // const result = await ticketChannels.updateMany(
    //     { resolved: false },
    //     { resolved: true }
    // );
    // console.log(`Marked ${result.modifiedCount} tickets as resolved`);

    process.exit(0)
  } catch (error) {
    console.error("Error:", error)
    process.exit(1)
  }
}

fixTicketLimit()
