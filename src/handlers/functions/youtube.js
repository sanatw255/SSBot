const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const YoutubeSubscription = require('../../database/models/youtubeSubscriptions');

const YT_RED  = '#FF0000';
const YT_ICON = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/512px-YouTube_full-color_icon_%282017%29.svg.png';

// ─── RSS Helpers ────────────────────────────────────────────────────────────

// Fetch the single latest video entry from a YouTube RSS feed
async function fetchLatestVideo(youtubeChannelId) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelId}`;
    const res = await axios.get(url, { timeout: 10000 });
    const xml = res.data;

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

// Fetch ALL video IDs currently in the RSS feed (used for first-run seeding)
async function fetchAllVideoIds(youtubeChannelId) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelId}`;
    const res = await axios.get(url, { timeout: 10000 });
    const matches = [...res.data.matchAll(/<yt:videoId>(.*?)<\/yt:videoId>/g)];
    return matches.map(m => m[1].trim());
}

// ─── Embed Builder ───────────────────────────────────────────────────────────

function buildEmbed(latest) {
    const dateStr = latest.publishedAt.toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });

    let desc = latest.description.trim();
    if (desc.length > 200) desc = desc.slice(0, 200) + '...';

    const embed = new EmbedBuilder()
        .setColor(YT_RED)
        .setAuthor({ name: latest.author })
        .setTitle(latest.title)
        .setURL(latest.url)
        .setDescription(
            `**${latest.author}** published a video on YouTube!` +
            (desc ? `\n\n**Description**\n${desc}` : '')
        )
        .setFooter({ text: `YouTube • ${dateStr}`, iconURL: YT_ICON })
        .setTimestamp(latest.publishedAt);

    if (latest.thumbnail) embed.setImage(latest.thumbnail);
    return embed;
}

// ─── Poller ──────────────────────────────────────────────────────────────────

module.exports = (client) => {
    // CRITICAL: Only run on shard 0 to prevent duplicate notifications.
    // The handler loader in bot.js runs this file on EVERY shard simultaneously.
    if (client.shard && client.shard.ids[0] !== 0) return;

    const POLL_INTERVAL_MS = 1 * 60 * 1000; // 1 minute

    const checkYoutube = async () => {
        try {
            const subscriptions = await YoutubeSubscription.find({});
            if (!subscriptions.length) return;

            for (const sub of subscriptions) {
                try {
                    // ── First-run seeding ────────────────────────────────────
                    // If NotifiedVideoIds is empty (new subscription OR migration
                    // from old single-ID schema), fetch ALL current video IDs from
                    // the RSS feed and mark them as "already notified" without
                    // sending any pings. This prevents spam on bot restart.
                    if (!sub.NotifiedVideoIds || sub.NotifiedVideoIds.length === 0) {
                        const allIds = await fetchAllVideoIds(sub.YoutubeChannelId);
                        sub.NotifiedVideoIds = allIds;
                        sub.LastVideoId = allIds[0] || null;
                        await sub.save();
                        continue;
                    }

                    const latest = await fetchLatestVideo(sub.YoutubeChannelId);
                    if (!latest) continue;

                    // ── Duplicate guard ──────────────────────────────────────
                    // This is the core fix. Once a video ID is in NotifiedVideoIds,
                    // it will NEVER trigger a notification again — no matter how
                    // many times YouTube's CDN serves it as "latest" in the RSS feed.
                    if (sub.NotifiedVideoIds.includes(latest.videoId)) continue;

                    // ── New video! Send notification ─────────────────────────
                    const guild = client.guilds.cache.get(sub.Guild);
                    if (!guild) continue;

                    const channel = guild.channels.cache.get(sub.DiscordChannelId);
                    if (!channel) continue;

                    await channel.send({
                        content: `@everyone **${latest.author}** just uploaded **${latest.title}** at ${latest.url}!!`,
                        embeds: [buildEmbed(latest)],
                        allowedMentions: { parse: ['everyone'] },
                    });

                    // Add to the notified set. Cap at 50 to prevent unbounded growth.
                    sub.NotifiedVideoIds = [...sub.NotifiedVideoIds, latest.videoId].slice(-50);
                    sub.LastVideoId = latest.videoId;
                    await sub.save();

                } catch (err) {
                    console.error(`[YouTube] Error on channel ${sub.YoutubeChannelId}:`, err.message);
                }
            }
        } catch (err) {
            console.error('[YouTube] Poll error:', err.message);
        }
    };

    checkYoutube();
    setInterval(checkYoutube, POLL_INTERVAL_MS);
};
