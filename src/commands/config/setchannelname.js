const Discord = require("discord.js");

module.exports = async (client, interaction, args) => {
  const template = interaction.options.getString("template");

  if (
    !interaction.member.permissions.has([
      Discord.PermissionsBitField.Flags.Administrator,
    ])
  ) {
    return client.errNormal(
      {
        error: "You don't have permission to use this command!",
        type: "editreply",
      },
      interaction
    );
  }

  client.setTemplate(interaction.guild, template);

  client.succNormal(
    {
      text: `Template has been set!`,
      fields: [
        {
          name: `📘┆New template`,
          value: `${template}`,
        },
        {
          name: `📘┆Available variables`,
          value: `{emoji} - The emoji for the stat\n{name} - The name/value for the stat`,
        },
      ],
      type: "editreply",
    },
    interaction
  );
};
