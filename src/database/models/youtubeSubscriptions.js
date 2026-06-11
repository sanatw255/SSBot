const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    Guild: { type: String, required: true },
    YoutubeChannelId: { type: String, required: true },
    YoutubeChannelName: { type: String, required: true },
    DiscordChannelId: { type: String, required: true },
    LastVideoId: { type: String, default: null },
});

module.exports = mongoose.model('youtubeSubscriptions', Schema);
