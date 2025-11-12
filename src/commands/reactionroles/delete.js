const Discord = require("discord.js");

const Schema = require("../../database/models/reactionRoles");

module.exports = async (client, interaction, args) => {
  const category = interaction.options.getString("category");

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      Category: category,
    });

    if (!data)
      return client.errNormal(
        {
          error: `No data found!`,
          type: "editreply",
        },
        interaction
      );

    await Schema.deleteOne({ Guild: interaction.guild.id, Category: category });

    client.succNormal(
      {
        text: `**${category}** successfully deleted!`,
        type: "editreply",
      },
      interaction
    );
  } catch (err) {
    console.error("Error in reactionroles delete command:", err);
    client.errNormal(
      {
        error: "An error occurred while deleting the reaction role.",
        type: "editreply",
      },
      interaction
    );
  }
};
