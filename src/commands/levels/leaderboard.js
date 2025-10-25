const Discord = require("discord.js");
const Schema = require("../../database/models/levels");
const Functions = require("../../database/models/functions");

module.exports = async (client, interaction, args) => {
  const data = await Functions.findOne({ Guild: interaction.guild.id });

  if (data && data.Levels == true) {
    try {
      const leaderboard = await Schema.find({ guildID: interaction.guild.id })
        .sort([["xp", "descending"]])
        .limit(10)
        .exec();

      if (!leaderboard || leaderboard.length === 0) {
        return client.errNormal(
          {
            error: "No leaderboard data found!",
            type: "editreply",
          },
          interaction
        );
      }

      let embed_desc = "";
      for (let i = 0; i < leaderboard.length; i++) {
        const user = await client.users
          .fetch(leaderboard[i].userID)
          .catch(() => null);
        embed_desc += `**${i + 1}.** ${
          user ? user.tag : "Unknown User"
        } - Level: ${leaderboard[i].level} | XP: ${leaderboard[i].xp}\n`;
      }

      client.embed(
        {
          title: `📊 Level Leaderboard`,
          desc: embed_desc,
          color: client.config.colors.normal,
        },
        interaction
      );
    } catch (error) {
      console.error("[LEVELS-LEADERBOARD]", error);
      client.errNormal(
        {
          error: "An error occurred!",
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
