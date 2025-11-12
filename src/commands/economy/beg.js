const Discord = require("discord.js");

const Schema = require("../../database/models/economyTimeout");

module.exports = async (client, interaction, args) => {
  let user = interaction.user;

  let timeout = 180000;
  let amount = 5;

  try {
    const dataTime = await Schema.findOne({
      Guild: interaction.guild.id,
      User: user.id,
    });

    if (
      dataTime &&
      dataTime.Beg !== null &&
      timeout - (Date.now() - dataTime.Beg) > 0
    ) {
      let time = (dataTime.Beg / 1000 + timeout / 1000).toFixed(0);
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
          text: `You've begged for some money!`,
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
        dataTime.Beg = Date.now();
        await dataTime.save();
      } else {
        await new Schema({
          Guild: interaction.guild.id,
          User: user.id,
          Beg: Date.now(),
        }).save();
      }

      client.addMoney(interaction, user, amount);
    }
  } catch (err) {
    console.error("Error in beg command:", err);
    client.errNormal(
      { error: "An error occurred while begging.", type: "editreply" },
      interaction
    );
  }
};
