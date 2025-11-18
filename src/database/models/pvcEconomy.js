const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  Guild: { type: String, required: true },
  User: { type: String, required: true },
  Coins: { type: Number, default: 0 },
  LastWork: { type: Date, default: null },
  LastDaily: { type: Date, default: null },
  TotalEarned: { type: Number, default: 0 },
  TotalSpent: { type: Number, default: 0 },
  TotalGifted: { type: Number, default: 0 },
  TotalReceived: { type: Number, default: 0 },
  CreatedAt: { type: Date, default: Date.now },
});

// Create compound index for faster queries
Schema.index({ Guild: 1, User: 1 }, { unique: true });

module.exports = mongoose.model("pvcEconomy", Schema);
