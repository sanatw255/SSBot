const Discord = require("discord.js");

const Schema = require("../../database/models/messageRewards");

module.exports = async (client, interaction, args) => {
  let messages = interaction.options.getNumber("amount");
  let role = interaction.options.getRole("role");

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
      Messages: messages,
    });

    if (data) {
      return client.errNormal(
        {
          error: "This message amount already has a reward!",
          type: "editreply",
        },
        interaction
      );
    } else {
      await new Schema({
        Guild: interaction.guild.id,
        Messages: messages,
        Role: role.id,
      }).save();

      client.succNormal(
        {
          text: `Message reward created`,
          fields: [
            {
              name: "📘┆Role",
              value: `${role}`,
              inline: true,
            },
          ],
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in createreward command:", err);
    client.errNormal(
      {
        error: "An error occurred while creating the message reward.",
        type: "editreply",
      },
      interaction
    );
  }
};
