const Discord = require("discord.js");
const Schema = require("../../database/models/levelRewards");

module.exports = async (client, interaction, args) => {
  const level = interaction.options.getNumber("level");

  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageMessages],
      perms: [Discord.PermissionsBitField.Flags.ManageMessages],
    },
    interaction
  );

  if (perms == false) return;

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      Level: level,
    });

    if (data) {
      await Schema.findOneAndDelete({
        Guild: interaction.guild.id,
        Level: level,
      });

      client.succNormal(
        {
          text: `Level reward removed successfully!`,
          fields: [
            {
              name: "🆙┆Level",
              value: `${level}`,
              inline: true,
            },
          ],
          type: "editreply",
        },
        interaction
      );
    } else {
      return client.errNormal(
        {
          error: "No level reward found at this level!",
          type: "editreply",
        },
        interaction
      );
    }
  } catch (error) {
    console.error("Error deleting level reward:", error);
    client.errNormal(
      {
        error: "Failed to delete level reward",
        type: "editreply",
      },
      interaction
    );
  }
};
