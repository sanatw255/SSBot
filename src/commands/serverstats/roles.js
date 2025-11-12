const Discord = require("discord.js");

const Schema = require("../../database/models/stats");

module.exports = async (client, interaction, args) => {
  var channelName = await client.getTemplate(interaction.guild);
  channelName = channelName.replace(`{emoji}`, "👔");
  channelName = channelName.replace(
    `{name}`,
    `Roles: ${interaction.guild.roles.cache.size.toLocaleString()}`
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
          data.Roles = channel.id;
          await data.save();
        } else {
          await new Schema({
            Guild: interaction.guild.id,
            Roles: channel.id,
          }).save();
        }

        client.succNormal(
          {
            text: `Roles count created!`,
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
        console.error("Error in roles serverstats command:", err);
        client.errNormal(
          {
            error: "An error occurred while creating the roles counter.",
            type: "editreply",
          },
          interaction
        );
      }
    });
};
