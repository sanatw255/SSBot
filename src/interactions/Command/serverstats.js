const Discord = require("discord.js");

module.exports = {
  data: new Discord.SlashCommandBuilder()
    .setName("serverstats")
    .setDescription("📊 Server statistics commands")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("members")
        .setDescription("Create a members counter channel")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription(
              "Channel name template (use {count} for member count)"
            )
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("bots").setDescription("Create a bots counter channel")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channels")
        .setDescription("Create a channels counter channel")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roles")
        .setDescription("Create a roles counter channel")
    ),

  run: async (client, interaction, args) => {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "members") {
      require(`../../commands/serverstats/members`)(client, interaction, args);
    } else if (subcommand === "bots") {
      require(`../../commands/serverstats/bots`)(client, interaction, args);
    } else if (subcommand === "channels") {
      require(`../../commands/serverstats/channels`)(client, interaction, args);
    } else if (subcommand === "roles") {
      require(`../../commands/serverstats/roles`)(client, interaction, args);
    }
  },
};
