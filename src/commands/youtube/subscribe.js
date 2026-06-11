const axios = require('axios');
const YoutubeSubscription = require('../../database/models/youtubeSubscriptions');

// Resolve a YouTube channel URL or raw ID to a channel ID and display name
async function resolveYoutubeChannel(input) {
    input = input.trim();

    // Already a raw channel ID (starts with UC and ~24 chars)
    if (/^UC[\w-]{22}$/.test(input)) {
        const name = await fetchChannelName(input);
        return { id: input, name };
    }

    // Handle youtube.com/channel/UC... URLs
    const channelIdMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
    if (channelIdMatch) {
        const id = channelIdMatch[1];
        const name = await fetchChannelName(id);
        return { id, name };
    }

    // Handle youtube.com/@handle or youtube.com/c/name or youtube.com/user/name
    // We resolve these by fetching the channel page and extracting the channel ID from RSS
    const handleMatch = input.match(/youtube\.com\/(?:@|c\/|user\/)([^/?#&]+)/);
    if (handleMatch) {
        const handle = handleMatch[1];
        const resolved = await resolveHandleToChannelId(handle);
        return resolved;
    }

    // Plain handle without URL: e.g. @SarthakSachdeva
    const plainHandle = input.replace(/^@/, '');
    const resolved = await resolveHandleToChannelId(plainHandle);
    return resolved;
}

// Fetch the channel's display name from its RSS feed
async function fetchChannelName(channelId) {
    try {
        const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const res = await axios.get(url, { timeout: 10000 });
        const match = res.data.match(/<author>\s*<name>(.*?)<\/name>/);
        return match ? match[1].trim() : channelId;
    } catch {
        return channelId;
    }
}

// Resolve a @handle or vanity name to a channel ID via the channel page HTML
async function resolveHandleToChannelId(handle) {
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
            const html = res.data;

            // Extract channel ID from the page meta
            const idMatch = html.match(/"channelId":"(UC[\w-]{22})"/);
            if (idMatch) {
                const id = idMatch[1];
                const name = await fetchChannelName(id);
                return { id, name };
            }
        } catch {
            // Try next URL format
        }
    }

    return null;
}

module.exports = async (client, interaction) => {
    const input = interaction.options.getString('channel');
    const discordChannel = interaction.options.getChannel('notify');

    // Resolve the YouTube channel
    let resolved;
    try {
        resolved = await resolveYoutubeChannel(input);
    } catch (err) {
        return client.errNormal({
            error: `Could not resolve that YouTube channel. Please check the URL or ID and try again.`,
            type: 'editreply',
        }, interaction);

    }

    if (!resolved || !resolved.id) {
        return client.errNormal({
            error: `Could not find a YouTube channel matching "${input}". Try using the full channel URL (e.g. https://youtube.com/@SarthakSachdeva) or the channel ID starting with UC.`,
            type: 'editreply',
        }, interaction);
    }

    // Check for duplicate subscription
    const existing = await YoutubeSubscription.findOne({
        Guild: interaction.guild.id,
        YoutubeChannelId: resolved.id,
    });

    if (existing) {
        return client.errNormal({
            error: `This server is already subscribed to ${resolved.name}! Notifications go to <#${existing.DiscordChannelId}>.`,
            type: 'editreply',
        }, interaction);
    }

    // Save new subscription (LastVideoId = null so first poll just seeds it without pinging)
    await new YoutubeSubscription({
        Guild: interaction.guild.id,
        YoutubeChannelId: resolved.id,
        YoutubeChannelName: resolved.name,
        DiscordChannelId: discordChannel.id,
        LastVideoId: null,
    }).save();

    client.succNormal({
        text: `Successfully subscribed to **[${resolved.name}](https://www.youtube.com/channel/${resolved.id})**!\n\nUpload notifications will be sent to ${discordChannel} with a **@everyone** ping.\n\n> The bot will start pinging on the **next** new upload.`,
        fields: [
            { name: '📺 YouTube Channel', value: `[${resolved.name}](https://www.youtube.com/channel/${resolved.id})`, inline: true },
            { name: '🔔 Notify In', value: `<#${discordChannel.id}>`, inline: true },
        ],
        type: 'editreply',
    }, interaction);
};
