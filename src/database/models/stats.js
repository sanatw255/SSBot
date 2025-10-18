const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  Guild: String,
  Members: String,
  MembersChannelName: { type: String, default: "𒆜〢Citizens: {count}" },
  Boost: String,
  Channels: String,
  Roles: String,
  Emojis: String,
  AnimatedEmojis: String,
  NewsChannels: String,
  StageChannels: String,
  StaticEmojis: String,
  TextChannels: String,
  BoostTier: String,
  VoiceChannels: String,
  Time: String,
  TimeZone: String,
  ChannelTemplate: String,
});

module.exports = mongoose.model("stats", Schema);
