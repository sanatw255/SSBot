const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  Guild: String,
  Channels: [String], // Array of voice channel IDs or category IDs that grant XP
});

module.exports = mongoose.model("voiceXPChannels", Schema);
