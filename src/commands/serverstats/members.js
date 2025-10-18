const Discord = require("discord.js");
const Schema = require("../../database/models/stats");

module.exports = async (client, interaction, args) => {
  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageChannels],
      perms: [Discord.PermissionsBitField.Flags.ManageChannels],
    },
    interaction
  );

  if (perms == false) return;

  const customName =
    interaction.options?.getString("name") || "𒆜〢Citizens: {count}";
  const channelName = customName.replace(
    "{count}",
    interaction.guild.memberCount.toLocaleString()
  );

  try {
    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: Discord.ChannelType.GuildVoice,
      permissionOverwrites: [
        {
          deny: [Discord.PermissionsBitField.Flags.Connect],
          id: interaction.guild.id,
        },
      ],
    });

    // Save to database
    const existingData = await Schema.findOne({ Guild: interaction.guild.id });
    if (existingData) {
      existingData.Members = channel.id;
      existingData.MembersChannelName = customName;
      await existingData.save();
    } else {
      await new Schema({
        Guild: interaction.guild.id,
        Members: channel.id,
        MembersChannelName: customName,
      }).save();
    }

    client.succNormal(
      {
        text: `Member count channel created!`,
        fields: [
          {
            name: `📘┆Channel`,
            value: `${channel}`,
          },
          {
            name: `👥┆Current Count`,
            value: `${interaction.guild.memberCount.toLocaleString()}`,
          },
        ],
        type: "editreply",
      },
      interaction
    );
  } catch (error) {
    console.error("Error creating member stats channel:", error);
    client.errNormal(
      {
        error: "Failed to create member stats channel. Check my permissions!",
        type: "editreply",
      },
      interaction
    );
  }
};
