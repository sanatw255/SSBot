const Discord = require("discord.js");
const generator = require("generate-password");

const Schema = require("../../database/models/notes");

module.exports = async (client, interaction, args) => {
  let id = interaction.options.getString("id");

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      Code: id,
    });

    if (data) {
      await Schema.findOneAndDelete({ Guild: interaction.guild.id, Code: id });
      client.succNormal(
        { text: `Note **#${id}** has been deleted!`, type: "editreply" },
        interaction
      );
    } else {
      client.errNormal(
        { error: `No note found with the id **#${id}**`, type: "editreply" },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in delete notepad command:", err);
    client.errNormal(
      {
        error: "An error occurred while deleting the note.",
        type: "editreply",
      },
      interaction
    );
  }
};
