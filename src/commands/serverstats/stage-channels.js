const Discord = require("discord.js");

const Schema = require("../../database/models/stats");

module.exports = async (client, interaction, args) => {
  var channelName = await client.getTemplate(interaction.guild);
  channelName = channelName.replace(`{emoji}`, "🎤");
  channelName = channelName.replace(
    `{name}`,
    `Stage Channels: ${
      interaction.guild.channels.cache.filter(
        (channel) => channel.type === Discord.ChannelType.GuildStageVoice
      ).size || 0
    }`
  );

  await interaction.guild.channels
    .create({
      name: channelName,
      type: Discord.ChannelType.GuildVoice,
      permissionOverwrites: [
        {
          deny: [Discord.PermissionsBitField.Flags.Connect],
          id: interaction.guild.id,
        },
      ],
    })
    .then(async (channel) => {
      try {
        const data = await Schema.findOne({ Guild: interaction.guild.id });
        if (data) {
          data.StageChannels = channel.id;
          await data.save();
        } else {
          await new Schema({
            Guild: interaction.guild.id,
            StageChannels: channel.id,
          }).save();
        }

        client.succNormal(
          {
            text: `Stage channel count created!`,
            fields: [
              {
                name: `📘┆Channel`,
                value: `${channel}`,
              },
            ],
            type: "editreply",
          },
          interaction
        );
      } catch (err) {
        console.error("Error in stage-channels serverstats:", err);
        client.errNormal(
          {
            error:
              "An error occurred while setting up the stage channel counter.",
            type: "editreply",
          },
          interaction
        );
      }
    });
};
