const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    Guild: { type: String, required: true },
    YoutubeChannelId: { type: String, required: true },
    YoutubeChannelName: { type: String, required: true },
    DiscordChannelId: { type: String, required: true },
    LastVideoId: { type: String, default: null },
    // Array of ALL video IDs we've already sent notifications for.
    // Using an array instead of a single LastVideoId prevents duplicate
    // pings caused by YouTube's CDN serving inconsistent RSS responses.
    NotifiedVideoIds: { type: [String], default: [] },
});

module.exports = mongoose.model('youtubeSubscriptions', Schema);
