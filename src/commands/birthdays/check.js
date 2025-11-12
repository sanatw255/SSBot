const Discord = require("discord.js");

const Schema = require("../../database/models/birthday");

module.exports = async (client, interaction, args) => {
  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      User: interaction.user.id,
    });

    if (!data)
      return client.errNormal(
        {
          error: "No birthday found!",
          type: "editreply",
        },
        interaction
      );

    client.embed(
      {
        title: `${client.emotes.normal.birthday}・Birthday check`,
        desc: `${interaction.user.username} birthday is on ${data.Birthday}`,
        type: "editreply",
      },
      interaction
    );
  } catch (err) {
    console.error("Error in check birthday command:", err);
    client.errNormal(
      {
        error: "An error occurred while checking the birthday.",
        type: "editreply",
      },
      interaction
    );
  }
};
