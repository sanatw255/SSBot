const Discord = require("discord.js");

const store = require("../../database/models/economyStore");

module.exports = async (client, interaction, args, message) => {
  try {
    const storeData = await store.find({ Guild: interaction.guild.id });

    if (storeData && storeData.length > 0) {
      const lb = storeData.map(
        (e) =>
          `**<@&${e.Role}>** - ${client.emotes.economy.coins} $${e.Amount} \n**To buy:** \`buy ${e.Role}\``
      );

      await client.createLeaderboard(
        `🛒・${interaction.guild.name}'s Store`,
        lb,
        interaction
      );
      client.embed(
        {
          title: `🛒・Bot's Store`,
          desc: `**Fishingrod** - ${client.emotes.economy.coins} $100 \n**To buy:** \`buy fishingrod\``,
        },
        interaction.channel
      );
    } else {
      client.errNormal(
        {
          error: `No store found in this guild!`,
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in store command:", err);
    client.errNormal(
      {
        error: "An error occurred while fetching the store.",
        type: "editreply",
      },
      interaction
    );
  }
};
