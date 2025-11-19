const Discord = require("discord.js");
const Schema = require("../../database/models/levelRewards");
const Functions = require("../../database/models/functions");

module.exports = async (client, interaction, args) => {
  const data = await Functions.findOne({ Guild: interaction.guild.id });

  if (data && data.Levels == true) {
    try {
      const rewards = await Schema.find({ Guild: interaction.guild.id })
        .sort([["Level", "ascending"]])
        .exec();

      if (!rewards || rewards.length === 0) {
        return client.errNormal(
          {
            error: "No level rewards found!",
            type: "editreply",
          },
          interaction
        );
      }

      let embed_desc = "";
      for (let i = 0; i < rewards.length; i++) {
        const role = interaction.guild.roles.cache.get(rewards[i].Role);
        embed_desc += `**Level ${rewards[i].Level}** → ${
          role ? role.toString() : "Role not found"
        }\n`;
      }

      client.embed(
        {
          title: `🎁 Level Rewards`,
          desc: embed_desc,
          color: client.config.colors.normal,
          type: "editreply",
        },
        interaction
      );
    } catch (error) {
      console.error("[LEVELS-REWARDS]", error);
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
