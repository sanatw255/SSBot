const Discord = require("discord.js");
const generator = require("generate-password");

const Schema = require("../../database/models/notes");

module.exports = async (client, interaction, args) => {
  const code = generator.generate({
    length: 4,
    lowercase: false,
    uppercase: false,
    numbers: true,
  });

  let note = interaction.options.getString("note");

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      Code: code,
    });

    if (!data) {
      await new Schema({
        Guild: interaction.guild.id,
        User: interaction.user.id,
        Code: code,
        Note: note,
      }).save();

      client.succNormal(
        {
          text: "Note has been added! `/notepad notes` to see all your notes",
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in add notepad command:", err);
    client.errNormal(
      { error: "An error occurred while adding the note.", type: "editreply" },
      interaction
    );
  }
};
