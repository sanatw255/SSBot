const Discord = require("discord.js");

const Schema = require("../../database/models/guessWord");

module.exports = async (client, interaction, args) => {
  let wordList = client.config.wordList;

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      Channel: interaction.channel.id,
    });

    if (data) {
      try {
        wordList = wordList.split("\n");
        var word = wordList[Math.floor(Math.random() * wordList.length)];
        var shuffled = word
          .split("")
          .sort(function () {
            return 0.5 - Math.random();
          })
          .join("");

        data.Word = word;
        await data.save();

        client.succNormal(
          {
            text: `Word skipped successfully!`,
            type: "ephemeral",
          },
          interaction
        );

        return client.embed(
          {
            title: `💬・Guess the word`,
            desc: `Put the letters in the right position! \n\n🔀 ${shuffled.toLowerCase()}`,
          },
          interaction.channel
        );
      } catch (err) {
        console.error("Error shuffling word:", err);
      }
    } else {
      client.errNormal(
        {
          error: "You are not in the right channel!",
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in skipword command:", err);
    client.errNormal(
      {
        error: "An error occurred while skipping the word.",
        type: "editreply",
      },
      interaction
    );
  }
};
