const Discord = require("discord.js");

const Schema = require("../../database/models/messages");

module.exports = async (client, interaction, args) => {
  let user = interaction.options.getUser("user") || interaction.user;

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      User: user.id,
    });

    if (data) {
      client.embed(
        {
          title: "💬・Messages",
          desc: `**${user.tag}** has \`${data.Messages}\` messages`,
          type: "editreply",
        },
        interaction
      );
    } else {
      client.embed(
        {
          title: "💬・Messages",
          desc: `**${user.tag}** has \`0\` messages`,
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in show messages command:", err);
    client.errNormal(
      {
        error: "An error occurred while fetching message count.",
        type: "editreply",
      },
      interaction
    );
  }
};
