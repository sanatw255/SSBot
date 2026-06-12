const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const YoutubeSubscription = require('../../database/models/youtubeSubscriptions');

// YouTube brand red color
const YT_RED = '#FF0000';
// YouTube logo for the footer (a reliable CDN-hosted icon)
const YT_ICON = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/512px-YouTube_full-color_icon_%282017%29.svg.png';

// Parse the latest video from a YouTube RSS feed (no API key needed)
async function fetchLatestVideo(youtubeChannelId) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelId}`;
    const res = await axios.get(url, { timeout: 10000 });
    const xml = res.data;

    // Pull the first <entry> block (latest video)
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return null;

    const entry = entryMatch[1];

    const videoIdMatch   = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch     = entry.match(/<title>(.*?)<\/title>/);
    const linkMatch      = entry.match(/<link rel="alternate" href="(.*?)"/);
    const thumbnailMatch = entry.match(/<media:thumbnail url="(.*?)"/);
    const authorMatch    = xml.match(/<author>\s*<name>(.*?)<\/name>/);
    const descMatch      = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);

    if (!videoIdMatch || !titleMatch) return null;

    const videoId = videoIdMatch[1].trim();

    return {
        videoId,
        title:       titleMatch[1].trim(),
        url:         linkMatch ? linkMatch[1].trim() : `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail:   thumbnailMatch ? thumbnailMatch[1].trim() : null,
        author:      authorMatch ? authorMatch[1].trim() : 'Unknown',
        description: descMatch ? descMatch[1].trim() : '',
        publishedAt: publishedMatch ? new Date(publishedMatch[1].trim()) : new Date(),
    };
}

// Build the Pingcord-accurate embed
function buildEmbed(latest) {
    // Format publish date like Pingcord: "6/10/26, 19:59"
    const dateStr = latest.publishedAt.toLocaleString('en-US', {
        month:  'numeric',
        day:    'numeric',
        year:   '2-digit',
        hour:   '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    // Truncate description to ~200 chars, just like Pingcord shows it
    let desc = latest.description.trim();
    if (desc.length > 200) desc = desc.slice(0, 200) + '...';

    const embed = new EmbedBuilder()
        .setColor(YT_RED)
        // Author line = channel name (Pingcord uses channel name here)
        .setAuthor({ name: latest.author })
        // Title = video title, linked to the video
        .setTitle(latest.title)
        .setURL(latest.url)
        // Description mimics Pingcord: "[Channel] published a video on YouTube!" + optional desc
        .setDescription(
            `**${latest.author}** published a video on YouTube!` +
            (desc ? `\n\n**Description**\n${desc}` : '')
        )
        // Large video thumbnail, just like Pingcord
        .setFooter({
            text: `YouTube • ${dateStr}`,
            iconURL: YT_ICON,
        })
        .setTimestamp(latest.publishedAt);

    if (latest.thumbnail) embed.setImage(latest.thumbnail);

    return embed;
}

module.exports = (client) => {
    // ─── Poll every 2 minutes for near-instant notifications ───────────────────
    const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

    const checkYoutube = async () => {
        try {
            const subscriptions = await YoutubeSubscription.find({});
            if (!subscriptions.length) return;

            for (const sub of subscriptions) {
                try {
                    const latest = await fetchLatestVideo(sub.YoutubeChannelId);
                    if (!latest) continue;

                    // Same video as last time — nothing to do
                    if (sub.LastVideoId === latest.videoId) continue;

                    // First run — seed the LastVideoId silently, no ping
                    if (!sub.LastVideoId) {
                        sub.LastVideoId = latest.videoId;
                        await sub.save();
                        continue;
                    }

                    // ── New video detected! ──────────────────────────────────────
                    const guild = client.guilds.cache.get(sub.Guild);
                    if (!guild) continue;

                    const channel = guild.channels.cache.get(sub.DiscordChannelId);
                    if (!channel) continue;

                    const embed = buildEmbed(latest);

                    // Send the @everyone text + Pingcord-style embed
                    await channel.send({
                        content: `@everyone **${latest.author}** just uploaded **${latest.title}** at ${latest.url}`,
                        embeds: [embed],
                        allowedMentions: { parse: ['everyone'] },
                    });

                    // Save new LastVideoId so we don't ping again
                    sub.LastVideoId = latest.videoId;
                    await sub.save();

                } catch (err) {
                    // Skip broken subscriptions (deleted channel, network error, etc.)
                    console.error(`[YouTube] Error checking channel ${sub.YoutubeChannelId}:`, err.message);
                }
            }
        } catch (err) {
            console.error('[YouTube] Poll error:', err.message);
        }
    };

    // Run immediately on startup, then every 2 minutes
    checkYoutube();
    setInterval(checkYoutube, POLL_INTERVAL_MS);
};
