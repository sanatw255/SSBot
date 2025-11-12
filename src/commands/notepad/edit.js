const Discord = require("discord.js");

const Schema = require("../../database/models/notes");

module.exports = async (client, interaction, args) => {
  let id = interaction.options.getString("id");
  let note = interaction.options.getString("note");

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      Code: id,
    });

    if (data) {
      data.Note = note;
      await data.save();

      client.succNormal(
        { text: "Note has been edited!", type: "editreply" },
        interaction
      );
    } else {
      client.errNormal(
        { error: `No note found!`, type: "editreply" },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in edit notepad command:", err);
    client.errNormal(
      { error: "An error occurred while editing the note.", type: "editreply" },
      interaction
    );
  }
};
