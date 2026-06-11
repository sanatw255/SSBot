const { CommandInteraction, Client, SlashCommandBuilder, ChannelType } = require('discord.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('youtube')
        .setDescription('Manage YouTube upload notifications (Pingcord-style)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('subscribe')
                .setDescription('Subscribe to a YouTube channel and get pinged when they upload')
                .addStringOption(option =>
                    option
                        .setName('channel')
                        .setDescription('YouTube channel URL or Channel ID (e.g. https://youtube.com/@SarthakSachdeva or UCxxxxx)')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName('notify')
                        .setDescription('The Discord channel to send upload notifications in')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unsubscribe')
                .setDescription('Remove a YouTube upload notification subscription')
                .addStringOption(option =>
                    option
                        .setName('channel')
                        .setDescription('YouTube channel URL or Channel ID to unsubscribe from')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all YouTube subscriptions for this server')
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        await interaction.deferReply({ withResponse: true });

        const perms = await client.checkUserPerms({
            flags: [Discord.PermissionsBitField.Flags.Administrator],
            perms: [Discord.PermissionsBitField.Flags.Administrator],
        }, interaction);

        if (perms == false) return;

        client.loadSubcommands(client, interaction, args);
    },
};
