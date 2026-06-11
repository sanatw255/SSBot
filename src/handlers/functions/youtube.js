const axios = require('axios');
const YoutubeSubscription = require('../../database/models/youtubeSubscriptions');

// Parse the latest video from a YouTube RSS feed (no API key needed)
async function fetchLatestVideo(youtubeChannelId) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelId}`;
    const res = await axios.get(url, { timeout: 10000 });
    const xml = res.data;

    // Pull the first <entry> block (latest video)
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return null;

    const entry = entryMatch[1];

    const videoIdMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>(.*?)<\/title>/);
    const linkMatch = entry.match(/<link rel="alternate" href="(.*?)"/);
    const thumbnailMatch = entry.match(/<media:thumbnail url="(.*?)"/);
    const authorMatch = xml.match(/<author>\s*<name>(.*?)<\/name>/);
    const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);

    if (!videoIdMatch || !titleMatch) return null;

    return {
        videoId: videoIdMatch[1].trim(),
        title: titleMatch[1].trim(),
        url: linkMatch ? linkMatch[1].trim() : `https://www.youtube.com/watch?v=${videoIdMatch[1].trim()}`,
        thumbnail: thumbnailMatch ? thumbnailMatch[1].trim() : null,
        author: authorMatch ? authorMatch[1].trim() : 'Unknown',
        description: descMatch ? descMatch[1].trim().slice(0, 200) : '',
    };
}

module.exports = (client) => {
    const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

    const checkYoutube = async () => {
        try {
            const subscriptions = await YoutubeSubscription.find({});
            if (!subscriptions.length) return;

            for (const sub of subscriptions) {
                try {
                    const latest = await fetchLatestVideo(sub.YoutubeChannelId);
                    if (!latest) continue;

                    // Skip if this is the same video we already notified about
                    if (sub.LastVideoId === latest.videoId) continue;

                    // First time seeing this channel — just store the ID, don't ping
                    if (!sub.LastVideoId) {
                        sub.LastVideoId = latest.videoId;
                        await sub.save();
                        continue;
                    }

                    // New video detected! Find the guild and channel
                    const guild = client.guilds.cache.get(sub.Guild);
                    if (!guild) continue;

                    const channel = guild.channels.cache.get(sub.DiscordChannelId);
                    if (!channel) continue;

                    // Build the rich embed (Pingcord-style)
                    const { EmbedBuilder } = require('discord.js');
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setAuthor({ name: latest.author })
                        .setTitle(latest.title)
                        .setURL(latest.url)
                        .setDescription(
                            latest.description
                                ? `${latest.description}${latest.description.length >= 200 ? '...' : ''}`
                                : `${latest.author} published a video on YouTube!`
                        )
                        .setFooter({ text: `YouTube • ${new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, iconURL: 'https://www.iconpacks.net/icons/2/free-youtube-logo-icon-2431-thumb.png' })
                        .setTimestamp();

                    if (latest.thumbnail) embed.setImage(latest.thumbnail);

                    // Send @everyone ping + embed
                    await channel.send({
                        content: `@everyone **${latest.author}** just uploaded **${latest.title}** at ${latest.url}!!`,
                        embeds: [embed],
                        allowedMentions: { parse: ['everyone'] },
                    });

                    // Update the last seen video ID
                    sub.LastVideoId = latest.videoId;
                    await sub.save();

                } catch (err) {
                    // Silently skip broken subscriptions (deleted channels, network errors, etc.)
                    console.error(`[YouTube] Error checking channel ${sub.YoutubeChannelId}:`, err.message);
                }
            }
        } catch (err) {
            console.error('[YouTube] Poll error:', err.message);
        }
    };

    // Initial check then recurring interval
    checkYoutube();
    setInterval(checkYoutube, POLL_INTERVAL_MS);
};
