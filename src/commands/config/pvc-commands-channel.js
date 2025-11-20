const Discord = require("discord.js");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, interaction, args) => {
  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageGuild],
      perms: [Discord.PermissionsBitField.Flags.ManageGuild],
    },
    interaction
  );

  if (perms == false) return;

  const channel = interaction.options.getChannel("channel");

  try {
    let config = await pvcConfig.findOne({ Guild: interaction.guild.id });
    if (!config) {
      config = await new pvcConfig({ Guild: interaction.guild.id }).save();
    }

    config.CommandsChannel = channel.id;
    await config.save();

    return client.succNormal(
      {
        text: `PVC commands channel has been set to ${channel}!`,
        fields: [
          {
            name: "📝 Commands Available",
            value:
              "`!create`, `!extend`, `!rename`, `!delete`, `!transfer`, `!vi`, `!vui`",
          },
        ],
        type: "editreply",
      },
      interaction
    );
  } catch (err) {
    console.error("Error in pvc-commands-channel config:", err);
    return client.errNormal(
      {
        error: "An error occurred while updating configuration!",
        type: "editreply",
      },
      interaction
    );
  }
};
