const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  Guild: String,
  Roles: [String], // Array of role IDs that won't gain XP
  Users: [String], // Array of user IDs that won't gain XP
});

module.exports = mongoose.model("levelExcludedRoles", Schema);
