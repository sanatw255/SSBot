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

    await Schema.findOneAndDelete({
      Guild: interaction.guild.id,
      User: interaction.user.id,
    });

    client.succNormal(
      {
        text: "Deleted your birthday",
        type: "editreply",
      },
      interaction
    );
  } catch (err) {
    console.error("Error in delete birthday command:", err);
    client.errNormal(
      {
        error: "An error occurred while deleting the birthday.",
        type: "editreply",
      },
      interaction
    );
  }
};
