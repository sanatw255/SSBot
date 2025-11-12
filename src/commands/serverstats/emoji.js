const Discord = require("discord.js");

const Schema = require("../../database/models/stats");

module.exports = async (client, interaction, args) => {
  var channelName = await client.getTemplate(interaction.guild);
  channelName = channelName.replace(`{emoji}`, "😛");
  channelName = channelName.replace(
    `{name}`,
    `Emojis: ${interaction.guild.emojis.cache.size || "0"}`
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
          data.Emojis = channel.id;
          await data.save();
        } else {
          await new Schema({
            Guild: interaction.guild.id,
            Emojis: channel.id,
          }).save();
        }
        client.succNormal(
          {
            text: `Emoji's count created!`,
            fields: [{ name: `📘┆Channel`, value: `${channel}` }],
            type: "editreply",
          },
          interaction
        );
      } catch (err) {
        console.error("Error in emoji serverstats:", err);
        client.errNormal(
          { error: "An error occurred.", type: "editreply" },
          interaction
        );
      }
    });
};
