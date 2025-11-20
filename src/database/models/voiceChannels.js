const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  Guild: { type: String, required: true },
  Channel: { type: String, required: true, unique: true },
  TextChannel: { type: String, default: null }, // VC's text chat channel ID
  Owner: { type: String, required: true }, // User ID who created/owns the VC
  CreatedAt: { type: Date, default: Date.now },
  ExpiresAt: { type: Date, default: null }, // Null if PAYG, set if paid
  IsPAYG: { type: Boolean, default: false }, // Pay-As-You-Go mode
  IsLocked: { type: Boolean, default: false }, // Lock status
  IsHidden: { type: Boolean, default: false }, // Visibility status
  InvitedUsers: { type: [String], default: [] }, // Array of user IDs with access
  PaidDuration: { type: Number, default: 0 }, // Duration in minutes (0 if PAYG)
  CoinsSpent: { type: Number, default: 0 }, // Total coins spent on this VC
  LastPAYGDeduction: { type: Date, default: null }, // Last time PAYG was deducted
  ActiveSince: { type: Date, default: null }, // When billing started (for PAYG)
  EmptySince: { type: Date, default: null }, // When VC became empty (all members left)
  PAYGWarningGiven: { type: Boolean, default: false }, // Whether low balance warning was sent
});

// Create indexes for faster queries
Schema.index({ Guild: 1, Owner: 1 });
Schema.index({ Guild: 1, Channel: 1 });

module.exports = mongoose.model("voiceChannels", Schema);
