//Members can set the AFK, with /afk set command.
const Discord = require("discord.js");

const Schema = require("../../database/models/afk");

module.exports = async (client, interaction, args) => {
  const reason = interaction.options.getString("reason") || `Not specified`;

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      User: interaction.user.id,
    });
    if (data) {
      return client.errNormal(
        {
          error: `You're already afk!`,
          type: "editreply",
        },
        interaction
      );
    } else {
      await new Schema({
        Guild: interaction.guild.id,
        User: interaction.user.id,
        Message: reason,
      }).save();

      if (!interaction.member.displayName.includes(`[AFK] `)) {
        interaction.member
          .setNickname(`[AFK] ` + interaction.member.displayName)
          .catch((e) => {});
      }

      client.succNormal(
        {
          text: `Your AFK has been set up successfully`,
          type: "ephemeraledit",
        },
        interaction
      );

      client.embed(
        {
          desc: `${interaction.user} is now afk! **Reason:** ${reason}`,
        },
        interaction.channel
      );
    }
  } catch (err) {
    console.error("Error setting AFK:", err);
    client.errNormal(
      {
        error: "An error occurred while setting your AFK status.",
        type: "editreply",
      },
      interaction
    );
  }
};
