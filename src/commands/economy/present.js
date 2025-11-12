const Discord = require("discord.js");

const Schema = require("../../database/models/economy");
const Schema2 = require("../../database/models/economyTimeout");

module.exports = async (client, interaction, args) => {
  let user = interaction.user;
  let timeout = 604800000;

  try {
    const dataTime = await Schema2.findOne({
      Guild: interaction.guild.id,
      User: user.id,
    });

    if (
      dataTime &&
      dataTime.Present !== null &&
      timeout - (Date.now() - dataTime.Present) > 0
    ) {
      let time = (dataTime.Present / 1000 + timeout / 1000).toFixed(0);
      return client.errWait(
        {
          time: time,
          type: "editreply",
        },
        interaction
      );
    } else {
      let amount = Math.floor(Math.random() * 1000) + 1;

      client.succNormal(
        {
          text: `You've collected your present reward!`,
          fields: [
            {
              name: `${client.emotes.economy.coins}┆Amount`,
              value: `$${amount}`,
              inline: true,
            },
          ],
          type: "editreply",
        },
        interaction
      );

      if (dataTime) {
        dataTime.Present = Date.now();
        await dataTime.save();
      } else {
        await new Schema2({
          Guild: interaction.guild.id,
          User: user.id,
          Present: Date.now(),
        }).save();
      }

      client.addMoney(interaction, user, amount);
    }
  } catch (err) {
    console.error("Error in present command:", err);
    client.errNormal(
      {
        error: "An error occurred while claiming your present.",
        type: "editreply",
      },
      interaction
    );
  }
};
