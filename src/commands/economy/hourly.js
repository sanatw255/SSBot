const Discord = require("discord.js");

const Schema = require("../../database/models/economy");
const Schema2 = require("../../database/models/economyTimeout");

module.exports = async (client, interaction, args) => {
  let user = interaction.user;
  let timeout = 3600000;
  let amount = 10;

  try {
    const dataTime = await Schema2.findOne({
      Guild: interaction.guild.id,
      User: user.id,
    });

    if (
      dataTime &&
      dataTime.Hourly !== null &&
      timeout - (Date.now() - dataTime.Hourly) > 0
    ) {
      let time = (dataTime.Hourly / 1000 + timeout / 1000).toFixed(0);
      return client.errWait(
        {
          time: time,
          type: "editreply",
        },
        interaction
      );
    } else {
      client.succNormal(
        {
          text: `You've collected your hourly reward!`,
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
        dataTime.Hourly = Date.now();
        await dataTime.save();
      } else {
        await new Schema2({
          Guild: interaction.guild.id,
          User: user.id,
          Hourly: Date.now(),
        }).save();
      }

      client.addMoney(interaction, user, amount);
    }
  } catch (err) {
    console.error("Error in hourly command:", err);
    client.errNormal(
      {
        error: "An error occurred while processing your hourly reward.",
        type: "editreply",
      },
      interaction
    );
  }
};
