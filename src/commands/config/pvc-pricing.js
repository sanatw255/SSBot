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

  const coins = interaction.options.getInteger("coins");

  try {
    let config = await pvcConfig.findOne({ Guild: interaction.guild.id });
    if (!config) {
      config = await new pvcConfig({ Guild: interaction.guild.id }).save();
    }

    config.HourlyPrice = coins;
    config.PAYGPerMinute = Math.ceil(coins / 60);
    await config.save();

    return client.succNormal(
      {
        text: `PVC pricing has been updated!`,
        fields: [
          {
            name: "💰 1 Hour",
            value: `${coins.toLocaleString()} coins`,
            inline: true,
          },
          {
            name: "⏱️ Per Minute (PAYG)",
            value: `${config.PAYGPerMinute} coins`,
            inline: true,
          },
        ],
        type: "editreply",
      },
      interaction
    );
  } catch (err) {
    console.error("Error in pvc-pricing config:", err);
    return client.errNormal(
      {
        error: "An error occurred while updating configuration!",
        type: "editreply",
      },
      interaction
    );
  }
};
