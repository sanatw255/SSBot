const Discord = require("discord.js");
const Functions = require("../../database/models/functions");
const Schema = require("../../database/models/levels");

module.exports = async (client, interaction, args) => {
  const data = await Functions.findOne({ Guild: interaction.guild.id });

  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageMessages],
      perms: [Discord.PermissionsBitField.Flags.ManageMessages],
    },
    interaction
  );

  if (perms == false) return;

  if (data && data.Levels == true) {
    try {
      const target = interaction.options.getUser("user");
      const xp = interaction.options.getNumber("amount");

      if (!target) {
        return client.errNormal(
          {
            error: "User not found!",
            type: "editreply",
          },
          interaction
        );
      }

      const user = await client.setXP(target.id, interaction.guild.id, xp);

      if (!user) {
        return client.errNormal(
          {
            error: "This user has no level data!",
            type: "editreply",
          },
          interaction
        );
      }

      client.succNormal(
        {
          text: `XP has been modified successfully`,
          fields: [
            {
              name: "🆕┆New XP",
              value: `${user.xp}`,
              inline: true,
            },
            {
              name: "👤┆User",
              value: `${target} (${target.tag})`,
              inline: true,
            },
          ],
          type: "editreply",
        },
        interaction
      );
    } catch (error) {
      console.error("[LEVELS-SETXP]", error);
      client.errNormal(
        {
          error: "An error occurred!",
          type: "editreply",
        },
        interaction
      );
    }
  } else {
    client.errNormal(
      {
        error: "Levels are disabled in this guild!",
        type: "editreply",
      },
      interaction
    );
  }
};
