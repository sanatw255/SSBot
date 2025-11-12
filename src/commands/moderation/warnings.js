const Discord = require("discord.js");

const Schema = require("../../database/models/warnings");

module.exports = async (client, interaction, args) => {
  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageMessages],
      perms: [Discord.PermissionsBitField.Flags.ManageMessages],
    },
    interaction
  );

  if (perms == false) {
    client.errNormal(
      {
        error: "You don't have the required permissions to use this command!",
        type: "editreply",
      },
      interaction
    );
    return;
  }

  const member = interaction.options.getUser("user");

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      User: member.id,
    });

    if (data) {
      var fields = [];
      data.Warnings.forEach((element) => {
        fields.push({
          name: "Warning **" + element.Case + "**",
          value:
            "Reason: " +
            element.Reason +
            "\nModerator <@!" +
            element.Moderator +
            ">",
          inline: true,
        });
      });
      client.embed(
        {
          title: `${client.emotes.normal.error}・Warnings`,
          desc: `The warnings of **${member.tag}**`,
          fields: [
            {
              name: "Total",
              value: `${data.Warnings.length}`,
            },
            ...fields,
          ],
          type: "editreply",
        },
        interaction
      );
    } else {
      client.embed(
        {
          title: `${client.emotes.normal.error}・Warnings`,
          desc: `User ${member.tag} has no warnings!`,
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in warnings command:", err);
    client.errNormal(
      {
        error: "An error occurred while fetching warnings.",
        type: "editreply",
      },
      interaction
    );
  }
};
