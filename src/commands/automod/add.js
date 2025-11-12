//Admin can add words to make them blacklisted!
const Discord = require("discord.js");

const Schema = require("../../database/models/blacklist");

module.exports = async (client, interaction, args) => {
  const word = interaction.options.getString("word");

  try {
    const data = await Schema.findOne({ Guild: interaction.guild.id });

    if (data) {
      if (data.Words.includes(word)) {
        return client.errNormal(
          {
            error: `That word is already exists in the database!`,
            type: "editreply",
          },
          interaction
        );
      }
      if (!data.Words) data.Words = [];
      data.Words.push(word);
      await data.save();
    } else {
      await new Schema({
        Guild: interaction.guild.id,
        Words: word,
      }).save();
    }

    client.succNormal(
      {
        text: `Word is now blacklisted!`,
        fields: [
          {
            name: `💬┆Word`,
            value: `${word}`,
          },
        ],
        type: "editreply",
      },
      interaction
    );
  } catch (err) {
    console.error("Error in automod add command:", err);
    client.errNormal(
      {
        error: "An error occurred while adding the word to blacklist.",
        type: "editreply",
      },
      interaction
    );
  }
};
