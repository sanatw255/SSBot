const Discord = require("discord.js");
const Schema = require("../../database/models/functions");

module.exports = async (client, interaction, args) => {
  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageMessages],
      perms: [Discord.PermissionsBitField.Flags.ManageMessages],
    },
    interaction
  );

  if (perms == false) return;

  const boolean = interaction.options.getBoolean("boolean");

  try {
    let data = await Schema.findOne({ Guild: interaction.guild.id });

    if (data) {
      data.Levels = boolean;
      await data.save();
    } else {
      data = new Schema({
        Guild: interaction.guild.id,
        Levels: boolean,
      });
      await data.save();
    }

    client.succNormal(
      {
        text: `Levels is now **${
          boolean ? "enabled" : "disabled"
        }** in this guild`,
        type: "editreply",
      },
      interaction
    );
  } catch (error) {
    console.error("Error updating levels setting:", error);
    client.errNormal(
      {
        error: "Failed to update levels setting",
        type: "editreply",
      },
      interaction
    );
  }
};
