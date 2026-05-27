const Discord = require("discord.js");
const Functions = require("../../database/models/functions");
const Schema = require("../../database/models/levels");
const levelRewards = require("../../database/models/levelRewards");

module.exports = async (client, interaction, args) => {
  const data = await Functions.findOne({ Guild: interaction.guild.id });

  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageMessages],
      perms: [Discord.PermissionsBitField.Flags.ManageMessages],
    },
    interaction
  );

  if (perms == false) return;

  if (data && data.Levels == true) {
    try {
      const target = interaction.options.getUser("user");

      if (!target) {
        return client.errNormal(
          { error: "User not found!", type: "editreply" },
          interaction
        );
      }

      // Check if user has level data
      const userLevel = await Schema.findOne({
        userID: target.id,
        guildID: interaction.guild.id,
      });

      if (!userLevel) {
        return client.errNormal(
          { error: "This user has no level data!", type: "editreply" },
          interaction
        );
      }

      // Reset XP and level to 0
      await Schema.findOneAndUpdate(
        { userID: target.id, guildID: interaction.guild.id },
        { $set: { xp: 0, level: 0 } }
      );

      // Fetch all level rewards for this guild
      const rewards = await levelRewards.find({ Guild: interaction.guild.id });

      // Remove all level-reward roles from the member
      let removedRoles = 0;
      if (rewards.length > 0) {
        const member = await interaction.guild.members
          .fetch(target.id)
          .catch(() => null);

        if (member) {
          for (const reward of rewards) {
            if (member.roles.cache.has(reward.Role)) {
              await member.roles.remove(reward.Role).catch(console.error);
              removedRoles++;
            }
          }
        }
      }

      client.succNormal(
        {
          text: `Level data has been reset for ${target}`,
          fields: [
            {
              name: "👤┆User",
              value: `${target} (${target.tag})`,
              inline: true,
            },
            {
              name: "🆙┆New Level",
              value: `0`,
              inline: true,
            },
            {
              name: "✨┆New XP",
              value: `0`,
              inline: true,
            },
            {
              name: "🎭┆Roles Removed",
              value: `${removedRoles} level reward role(s)`,
              inline: true,
            },
          ],
          type: "editreply",
        },
        interaction
      );
    } catch (error) {
      console.error("[LEVELS-RESETUSER]", error);
      client.errNormal(
        { error: "An error occurred!", type: "editreply" },
        interaction
      );
    }
  } else {
    client.errNormal(
      { error: "Levels are disabled in this guild!", type: "editreply" },
      interaction
    );
  }
};
