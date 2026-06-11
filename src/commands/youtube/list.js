const YoutubeSubscription = require('../../database/models/youtubeSubscriptions');

module.exports = async (client, interaction) => {
    const subscriptions = await YoutubeSubscription.find({ Guild: interaction.guild.id });

    if (!subscriptions.length) {
    return client.errNormal({
            error: `This server has no YouTube subscriptions yet. Use /youtube subscribe to add one!`,
            type: 'editreply',
        }, interaction);
    }

    const lines = subscriptions.map((sub, i) =>
        `**${i + 1}.** [${sub.YoutubeChannelName}](https://www.youtube.com/channel/${sub.YoutubeChannelId}) → <#${sub.DiscordChannelId}>`
    );

    client.succNormal({
        text: `This server is subscribed to **${subscriptions.length}** YouTube channel${subscriptions.length === 1 ? '' : 's'}:\n\n${lines.join('\n')}`,
        type: 'editreply',
    }, interaction);
};
