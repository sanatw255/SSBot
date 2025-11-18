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

    // Check for role mention first
    const roleMention = message.mentions.roles.first();

    if (roleMention) {
      // Handle role-based removal
      const amountArg = args.find(
        (arg) => !arg.startsWith("<@") && !isNaN(parseInt(arg))
      );
      const amount = parseInt(amountArg);

      if (!amount || amount <= 0) {
        const embed = new Discord.EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("❌ Invalid Amount")
          .setDescription(
            `Please specify a valid amount to remove!\n\n**Usage**: \`!removecoins @role <amount>\`\n**Example**: \`!removecoins @VIP 500\``
          )
          .setFooter({
            text: message.guild.name,
            iconURL: message.guild.iconURL(),
          });

        return message.reply({ embeds: [embed] }).then((msg) => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
      }

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
              Coins: -amount,
            }).save();
          } else {
            userData.Coins -= amount;
            await userData.save();
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to remove coins from ${memberId}:`, err);
        }
      }

      const embed = new Discord.EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("✅ Coins Removed from Role!")
        .setDescription(
          `Successfully removed ${amount.toLocaleString()} coins from all members with ${roleMention}!`
        )
        .addFields(
          {
            name: "🎭 Role",
            value: `${roleMention}`,
            inline: true,
          },
          {
            name: "💰 Amount per User",
            value: `${amount.toLocaleString()} coins`,
            inline: true,
          },
          {
            name: "✅ Updated Users",
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

    // Handle user-based removal (original logic)
    const target = message.mentions.users.first();
    if (!target) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription(
          `Please mention a user or role!\n\n**Usage**: \`!removecoins @user <amount>\` or \`!removecoins @role <amount>\`\n**Examples**:\n• \`!removecoins @John 500\`\n• \`!removecoins @VIP 200\``
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Parse amount
    const amount = parseInt(
      args.find((arg) => !arg.startsWith("<@") && !isNaN(parseInt(arg)))
    );

    if (!amount || amount <= 0) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Invalid Amount")
        .setDescription(
          `Please specify a valid amount to remove!\n\n**Usage**: \`!removecoins @user <amount>\`\n**Example**: \`!removecoins @John 500\``
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

    if (!userData) {
      userData = await new pvcEconomy({
        Guild: message.guild.id,
        User: target.id,
        Coins: 0,
      }).save();
    }

    const oldBalance = userData.Coins;

    // Remove coins (can go negative)
    userData.Coins -= amount;
    await userData.save();

    // Success message
    const embed = new Discord.EmbedBuilder()
      .setColor("#FFA500")
      .setTitle("✅ Coins Removed")
      .setDescription(
        `Successfully removed ${amount.toLocaleString()} coins from ${target}!\n\n` +
          `**Previous Balance**: ${oldBalance.toLocaleString()} coins\n` +
          `**Removed**: ${amount.toLocaleString()} coins\n` +
          `**New Balance**: ${userData.Coins.toLocaleString()} coins`
      )
      .setFooter({
        text: `Admin: ${message.author.username}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    // Log action
    console.log(
      `[PVC Admin] ${message.author.tag} removed ${amount} coins from ${target.tag} (${oldBalance} → ${userData.Coins})`
    );
  } catch (err) {
    console.error("Error in removecoins command:", err);
    message.reply("❌ An error occurred while removing coins.").catch(() => {});
  }
};
