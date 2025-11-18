const Discord = require("discord.js");
const pvcEconomy = require("../../database/models/pvcEconomy");

module.exports = async (client, message, args) => {
  // Ignore bots
  if (message.author.bot) return;

  try {
    // Check if user has Administrator permission
    if (
      !message.member.permissions.has(Discord.PermissionFlagsBits.Administrator)
    ) {
      return; // Silently ignore non-admins
    }

    // Check for role mention
    const roleMention = message.mentions.roles.first();

    if (roleMention) {
      // Handle role-based reset
      const members = message.guild.members.cache.filter((member) =>
        member.roles.cache.has(roleMention.id)
      );

      if (members.size === 0) {
        const embed = new Discord.EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("❌ No Members Found")
          .setDescription("No members found with this role!")
          .setFooter({
            text: message.guild.name,
            iconURL: message.guild.iconURL(),
          });

        return message.reply({ embeds: [embed] }).then((msg) => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
      }

      let successCount = 0;

      for (const [memberId, member] of members) {
        if (member.user.bot) continue; // Skip bots

        try {
          let userData = await pvcEconomy.findOne({
            Guild: message.guild.id,
            User: memberId,
          });

          if (!userData) {
            userData = await new pvcEconomy({
              Guild: message.guild.id,
              User: memberId,
              Coins: 0,
            }).save();
          } else {
            userData.Coins = 0;
            await userData.save();
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to reset coins for ${memberId}:`, err);
        }
      }

      const embed = new Discord.EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("✅ Coins Reset for Role!")
        .setDescription(
          `Successfully reset coins for all members with ${roleMention}!`
        )
        .addFields(
          {
            name: "🎭 Role",
            value: `${roleMention}`,
            inline: true,
          },
          {
            name: "✅ Reset Users",
            value: `${successCount}`,
            inline: true,
          }
        )
        .setFooter({
          text: `Admin: ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // Check for user mention
    const target = message.mentions.users.first();

    // If "everyone" or "all" is specified, reset everyone's coins
    if (args.includes("everyone") || args.includes("all")) {
      // Create confirmation buttons
      const confirmButton = new Discord.ButtonBuilder()
        .setCustomId(`confirm_reset_${message.id}`)
        .setLabel("Confirm Reset")
        .setStyle(Discord.ButtonStyle.Danger)
        .setEmoji("⚠️");

      const cancelButton = new Discord.ButtonBuilder()
        .setCustomId(`cancel_reset_${message.id}`)
        .setLabel("Cancel")
        .setStyle(Discord.ButtonStyle.Secondary)
        .setEmoji("❌");

      const row = new Discord.ActionRowBuilder().addComponents(
        confirmButton,
        cancelButton
      );

      const embed = new Discord.EmbedBuilder()
        .setTitle("⚠️ Reset Everyone's Coins")
        .setDescription(
          `Are you sure you want to reset **everyone's** PVC coins in this server?\n\n` +
            `⚠️ **This action cannot be undone!**\n` +
            `All members will lose their coins.`
        )
        .setColor("#FF0000")
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      const msg = await message.reply({
        embeds: [embed],
        components: [row],
      });

      // Create collector for button interactions
      const filter = (i) =>
        i.user.id === message.author.id &&
        (i.customId === `confirm_reset_${message.id}` ||
          i.customId === `cancel_reset_${message.id}`);

      const collector = msg.createMessageComponentCollector({
        filter,
        time: 30000, // 30 seconds
        max: 1,
      });

      collector.on("collect", async (i) => {
        if (i.customId === `confirm_reset_${message.id}`) {
          try {
            // Delete all economy data for this guild
            const result = await pvcEconomy.deleteMany({
              Guild: message.guild.id,
            });

            await i.update({
              embeds: [
                new Discord.EmbedBuilder()
                  .setTitle("✅ Economy Reset Complete")
                  .setDescription(
                    `Successfully reset the PVC economy!\n\n` +
                      `📊 **Stats:**\n` +
                      `• Total users reset: **${result.deletedCount}**\n` +
                      `• All coins have been cleared`
                  )
                  .setColor("#00FF00")
                  .setFooter({
                    text: `Reset by ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL({
                      dynamic: true,
                    }),
                  })
                  .setTimestamp(),
              ],
              components: [],
            });
          } catch (err) {
            console.error("Error resetting economy:", err);
            await i.update({
              embeds: [
                new Discord.EmbedBuilder()
                  .setTitle("❌ Error")
                  .setDescription(
                    "An error occurred while resetting the economy."
                  )
                  .setColor("#FF0000"),
              ],
              components: [],
            });
          }
        } else if (i.customId === `cancel_reset_${message.id}`) {
          await i.update({
            embeds: [
              new Discord.EmbedBuilder()
                .setTitle("❌ Reset Cancelled")
                .setDescription("The economy reset has been cancelled.")
                .setColor("#FFA500"),
            ],
            components: [],
          });
        }
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          msg
            .edit({
              embeds: [
                new Discord.EmbedBuilder()
                  .setTitle("⏱️ Timeout")
                  .setDescription(
                    "Economy reset confirmation timed out. No changes were made."
                  )
                  .setColor("#FFA500"),
              ],
              components: [],
            })
            .catch(console.error);
        }
      });

      return;
    }

    // Handle single user reset (original logic)
    if (!target) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription(
          `Please mention a user, role, or use "everyone"!\n\n**Usage**:\n• \`!resetcoins @user\` - Reset a user's coins\n• \`!resetcoins @role\` - Reset all members with a role\n• \`!resetcoins everyone\` - Reset everyone's coins\n\n**Examples**:\n• \`!resetcoins @John\`\n• \`!resetcoins @VIP\`\n• \`!resetcoins everyone\``
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Get user's economy data
    let userData = await pvcEconomy.findOne({
      Guild: message.guild.id,
      User: target.id,
    });

    const oldBalance = userData ? userData.Coins : 0;

    if (!userData) {
      // Create new entry with 0 coins
      userData = await new pvcEconomy({
        Guild: message.guild.id,
        User: target.id,
        Coins: 0,
      }).save();
    } else {
      // Reset to 0
      userData.Coins = 0;
      await userData.save();
    }

    // Success message
    const embed = new Discord.EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("✅ Coins Reset")
      .setDescription(
        `Successfully reset ${target}'s coins!\n\n` +
          `**Previous Balance**: ${oldBalance.toLocaleString()} coins\n` +
          `**New Balance**: 0 coins`
      )
      .setFooter({
        text: `Admin: ${message.author.username}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    // Log action
    console.log(
      `[PVC Admin] ${message.author.tag} reset ${target.tag}'s coins (was ${oldBalance})`
    );
  } catch (err) {
    console.error("Error in resetcoins command:", err);
    message
      .reply("❌ An error occurred while resetting coins.")
      .catch(() => {});
  }
};
