const Discord = require("discord.js");

const Schema = require("../../database/models/stats");

module.exports = async (client, interaction, args) => {
  const members = await interaction.guild.members.fetch();

  var channelName = await client.getTemplate(interaction.guild);
  channelName = channelName.replace(`{emoji}`, "🤖");
  channelName = channelName.replace(
    `{name}`,
    `Bots: ${members.filter((member) => member.user.bot).size || 0}`
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
          data.Bots = channel.id;
          await data.save();
        } else {
          await new Schema({
            Guild: interaction.guild.id,
            Bots: channel.id,
          }).save();
        }

        client.succNormal(
          {
            text: `Bots count created!`,
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
        console.error("Error in bots serverstats command:", err);
        client.errNormal(
          {
            error: "An error occurred while creating the bots counter.",
            type: "editreply",
          },
          interaction
        );
      }
    });
};
