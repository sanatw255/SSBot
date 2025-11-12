const Discord = require("discord.js");

const voiceSchema = require("../../database/models/voice");

module.exports = async (client, interaction, args) => {
  const category = interaction.options.getChannel("category");
  const ChannelName = interaction.options.getString("channelname");

  interaction.guild.channels
    .create({
      name: ChannelName,
      type: Discord.ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          deny: [Discord.PermissionsBitField.Flags.Speak],
          id: interaction.guild.id,
        },
      ],
    })
    .then(async (ch) => {
      try {
        const data = await voiceSchema.findOne({ Guild: interaction.guild.id });
        if (data) {
          data.Category = category.id;
          data.Channel = ch.id;
          data.ChannelName = ChannelName;
          await data.save();
        } else {
          await new voiceSchema({
            Guild: interaction.guild.id,
            Channel: ch.id,
            ChannelName: ChannelName,
            Category: category.id,
          }).save();
        }

        client.succNormal(
          {
            text: `Custom voice has been set up successfully!`,
            fields: [
              {
                name: `📘┆Channel`,
                value: `${ch} (${ch.name})`,
              },
            ],
            type: "editreply",
          },
          interaction
        );
      } catch (err) {
        console.error("Error setting up custom voice:", err);
        client.errNormal(
          {
            error: "An error occurred while setting up custom voice.",
            type: "editreply",
          },
          interaction
        );
      }
    });
};
