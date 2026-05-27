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
    // Show confirmation buttons
    const row = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setCustomId("resetall_confirm")
        .setLabel("Confirm Reset")
        .setEmoji("✅")
        .setStyle(Discord.ButtonStyle.Danger),

      new Discord.ButtonBuilder()
        .setCustomId("resetall_cancel")
        .setLabel("Cancel")
        .setEmoji("❌")
        .setStyle(Discord.ButtonStyle.Secondary)
    );

    client.embed(
      {
        title: `⚠️・Reset All Levels`,
        desc: `Are you sure you want to **reset every user's XP and level to 0** in this server?\n\n> This will also **remove all level-reward roles** from every member.\n> **This action cannot be undone!**`,
        components: [row],
        type: "editreply",
      },
      interaction
    );

    const filter = (i) => i.user.id === interaction.user.id;

    interaction.channel
      .awaitMessageComponent({
        filter,
        componentType: Discord.ComponentType.Button,
        time: 60000,
      })
      .then(async (i) => {
        // ✅ Acknowledge the button interaction immediately (within 3s)
        // so Discord doesn't show "interaction failed" while we do heavy work.
        await i.deferUpdate();

        if (i.customId === "resetall_confirm") {
          // Disable buttons while processing
          const disabledRow = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder()
              .setCustomId("resetall_confirm")
              .setLabel("Resetting...")
              .setEmoji("⏳")
              .setStyle(Discord.ButtonStyle.Danger)
              .setDisabled(true),
            new Discord.ButtonBuilder()
              .setCustomId("resetall_cancel")
              .setLabel("Cancel")
              .setEmoji("❌")
              .setStyle(Discord.ButtonStyle.Secondary)
              .setDisabled(true)
          );
          await interaction.editReply({ components: [disabledRow] });

          // Reset all users' XP and level to 0
          const result = await Schema.updateMany(
            { guildID: interaction.guild.id },
            { $set: { xp: 0, level: 0 } }
          );

          // Fetch all level rewards for this guild
          const rewards = await levelRewards.find({
            Guild: interaction.guild.id,
          });

          let totalRolesRemoved = 0;

          if (rewards.length > 0) {
            const rewardRoleIds = rewards.map((r) => r.Role);

            // Fetch all guild members and strip level roles
            const members = await interaction.guild.members
              .fetch()
              .catch(() => null);

            if (members) {
              for (const [, member] of members) {
                if (member.user.bot) continue;

                for (const roleId of rewardRoleIds) {
                  if (member.roles.cache.has(roleId)) {
                    await member.roles.remove(roleId).catch(console.error);
                    totalRolesRemoved++;
                  }
                }
              }
            }
          }

          client.succNormal(
            {
              text: `All level data has been reset in this server!`,
              fields: [
                {
                  name: "👥┆Users Reset",
                  value: `${result.modifiedCount}`,
                  inline: true,
                },
                {
                  name: "🎭┆Roles Removed",
                  value: `${totalRolesRemoved} role assignment(s)`,
                  inline: true,
                },
              ],
              components: [],
              type: "editreply",
            },
            interaction
          );
        }

        if (i.customId === "resetall_cancel") {
          client.errNormal(
            {
              error: `Level reset has been cancelled!`,
              components: [],
              type: "editreply",
            },
            interaction
          );
        }
      })
      .catch(() => {
        client.errNormal(
          {
            error: "Time's up! The level reset has been cancelled.",
            components: [],
            type: "editreply",
          },
          interaction
        );
      });
  } else {
    client.errNormal(
      { error: "Levels are disabled in this guild!", type: "editreply" },
      interaction
    );
  }
};
