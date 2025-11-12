const Discord = require("discord.js");
const thanksSchema = require("../../database/models/thanks");

module.exports = async (client, interaction, args) => {
  const member = interaction.options.getUser("user");

  try {
    const data = await thanksSchema.findOne({ User: member.id });

    if (data) {
      return client.embed(
        {
          title: `🤝・Thanks`,
          desc: `**${member.tag}** has \`${data.Received}\` thanks`,
          type: "editreply",
        },
        interaction
      );
    } else {
      return client.embed(
        {
          title: `🤝・Thanks`,
          desc: `**${member.tag}** has \`0\` thanks`,
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in check thanks command:", err);
    client.errNormal(
      { error: "An error occurred while checking thanks.", type: "editreply" },
      interaction
    );
  }
};
