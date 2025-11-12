const Discord = require("discord.js");

const Schema = require("../../database/models/stickymessages");

module.exports = async (client, interaction, args) => {
  const channel = interaction.options.getChannel("channel");

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      Channel: channel.id,
    });

    if (data) {
      await Schema.findOneAndDelete({
        Guild: interaction.guild.id,
        Channel: channel.id,
      });

      client.succNormal(
        {
          text: "Sticky message deleted",
          fields: [
            {
              name: `📘┆Channel`,
              value: `${channel}`,
            },
          ],
          type: "editreply",
        },
        interaction
      );
    } else {
      client.errNormal(
        {
          error: "No message found!",
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in unstick command:", err);
    client.errNormal(
      {
        error: "An error occurred while deleting the sticky message.",
        type: "editreply",
      },
      interaction
    );
  }
};
