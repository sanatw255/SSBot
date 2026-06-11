const axios = require('axios');
const YoutubeSubscription = require('../../database/models/youtubeSubscriptions');

// Reuse the same resolution logic as subscribe.js
async function resolveYoutubeChannelId(input) {
    input = input.trim();

    if (/^UC[\w-]{22}$/.test(input)) return input;

    const channelIdMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
    if (channelIdMatch) return channelIdMatch[1];

    const handleMatch = input.match(/youtube\.com\/(?:@|c\/|user\/)([^/?#&]+)/);
    const handle = handleMatch ? handleMatch[1] : input.replace(/^@/, '');

    const urls = [
        `https://www.youtube.com/@${handle}`,
        `https://www.youtube.com/c/${handle}`,
        `https://www.youtube.com/user/${handle}`,
    ];

    for (const url of urls) {
        try {
            const res = await axios.get(url, {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SSBot/1.0)' },
            });
            const idMatch = res.data.match(/"channelId":"(UC[\w-]{22})"/);
            if (idMatch) return idMatch[1];
        } catch {
            // Try next
        }
    }
    return null;
}

module.exports = async (client, interaction) => {
    const input = interaction.options.getString('channel');

    let channelId;
    try {
        channelId = await resolveYoutubeChannelId(input);
    } catch {
    return client.errNormal({
            error: `Could not resolve that YouTube channel. Please check the URL or ID and try again.`,
            type: 'editreply',
        }, interaction);
    }

    if (!channelId) {
        return client.errNormal({
            error: `Could not find a YouTube channel matching that input.`,
            type: 'editreply',
        }, interaction);
    }

    const existing = await YoutubeSubscription.findOne({
        Guild: interaction.guild.id,
        YoutubeChannelId: channelId,
    });

    if (!existing) {
        return client.errNormal({
            error: `This server is not subscribed to that YouTube channel.`,
            type: 'editreply',
        }, interaction);
    }

    const channelName = existing.YoutubeChannelName;
    await YoutubeSubscription.deleteOne({ _id: existing._id });

    client.succNormal({
        text: `Successfully unsubscribed from **${channelName}**.\n\nThis server will no longer receive upload notifications for that channel.`,
        type: 'editreply',
    }, interaction);
};
