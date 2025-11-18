const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  Guild: { type: String, required: true, unique: true },
  EconomyChannel: { type: String, default: null }, // Channel ID where economy commands work
  PanelChannel: { type: String, default: null }, // Channel ID where control panel is posted
  WorkCooldown: { type: Number, default: 600000 }, // 10 minutes in ms
  WorkMin: { type: Number, default: 1000 },
  WorkMax: { type: Number, default: 3000 },
  DailyMin: { type: Number, default: 500 },
  DailyMax: { type: Number, default: 1500 },
  HourlyPrice: { type: Number, default: 3600 }, // Coins per hour
  PAYGPerMinute: { type: Number, default: 60 }, // Auto-calculated: HourlyPrice / 60
  LevelRewardsEnabled: { type: Boolean, default: true },
  BaseLevelReward: { type: Number, default: 1000 }, // Base coins per level
  Milestone10: { type: Number, default: 5000 }, // Bonus at level 10, 20, 30, 40, 60, 70, 80, 90, etc.
  Milestone50: { type: Number, default: 25000 }, // Bonus at level 50
  Milestone100: { type: Number, default: 100000 }, // Bonus at level 100, 200, etc.
  MinimumDuration: { type: Number, default: 30 }, // Minimum minutes for !create
  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now },
});

// Auto-update PAYGPerMinute when HourlyPrice changes
Schema.pre("save", function (next) {
  this.PAYGPerMinute = Math.ceil(this.HourlyPrice / 60);
  this.UpdatedAt = Date.now();
  next();
});

module.exports = mongoose.model("pvcConfig", Schema);
