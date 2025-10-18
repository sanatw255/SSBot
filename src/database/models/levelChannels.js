const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
  Guild: String,
  Channel: String, // For level up messages
  Channels: [String], // Array of channels where leveling is allowed
})

module.exports = mongoose.model("levelChannels", Schema)
