const Discord = require("discord.js");
const { RankCardBuilder, Font } = require("canvacord");
const Functions = require("../../database/models/functions");
const Schema = require("../../database/models/levels");

module.exports = async (client, interaction, args) => {
  const data = await Functions.findOne({ Guild: interaction.guild.id });

  if (data && data.Levels == true) {
    try {
      const target = interaction.options.getUser("user") || interaction.user;
      const user = await client.fetchLevels(target.id, interaction.guild.id);

      if (!user || !user.xp) {
        return client.errNormal(
          {
            error: "This user has no levels!",
            type: "editreply",
          },
          interaction
        );
      }

      const xpRequired = client.xpFor(user.level + 1);

      // Load fonts (required for Canvacord v6)
      Font.loadDefault();

      const rankCard = new RankCardBuilder()
        .setDisplayName(target.username)
        .setUsername(`@${target.username}`)
        .setAvatar(
          target.displayAvatarURL({ dynamic: false, extension: "png" })
        )
        .setCurrentXP(user.xp)
        .setRequiredXP(xpRequired)
        .setLevel(user.level)
        .setRank(user.position)
        .setStatus("dnd");

      const rankImage = await rankCard.build({ format: "png" });
      const attachment = new Discord.AttachmentBuilder(rankImage, {
        name: "RankCard.png",
      });
      interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("[LEVELS-RANK]", error);
      client.errNormal(
        {
          error: "An error occurred while generating rank card!",
          type: "editreply",
        },
        interaction
      );
    }
  } else {
    client.errNormal(
      {
        error: "Levels are disabled in this guild!",
        type: "editreply",
      },
      interaction
    );
  }
};
