const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  Guild: String,
  Enabled: { type: Boolean, default: false },
  XPAmount: { type: Number, default: 5 }, // XP to grant
  Interval: { type: Number, default: 5 }, // Minutes between XP grants
  AFKDetection: { type: Boolean, default: true }, // Stop XP if deafened/muted
  MinimumUsers: { type: Number, default: 2 }, // Minimum users in VC for XP
});

module.exports = mongoose.model("voiceXPConfig", Schema);
