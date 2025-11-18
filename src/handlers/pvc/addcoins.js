const Discord = require("discord.js");
const pvcEconomy = require("../../database/models/pvcEconomy");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, message, args) => {
  if (message.author.bot) return;

  try {
    // Check if user is admin (no channel restriction for admin commands)
    if (
      !message.member.permissions.has(Discord.PermissionFlagsBits.Administrator)
    ) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Permission Denied")
        .setDescription("Only administrators can use this command!")
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Check for role mention first
    const roleMention = message.mentions.roles.first();

    if (roleMention) {
      // Handle role-based addition
      const amountArg = args.find(
        (arg) => !arg.startsWith("<@") && !isNaN(parseInt(arg))
      );
      const amount = parseInt(amountArg);

      if (!amount || isNaN(amount) || amount <= 0) {
        const embed = new Discord.EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("❌ Invalid Amount")
          .setDescription(
            "Please specify a valid positive amount!\n\n**Usage**: `!addcoins @role <amount>`\n**Example**: `!addcoins @VIP 5000`"
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
              Coins: amount,
              TotalEarned: amount,
            }).save();
          } else {
            userData.Coins += amount;
            userData.TotalEarned += amount;
            await userData.save();
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to add coins to ${memberId}:`, err);
        }
      }

      const embed = new Discord.EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("✅ Coins Added to Role!")
        .setDescription(
          `${
            message.author
          } added **${amount.toLocaleString()}** coins to all members with ${roleMention}!`
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
          text: `Admin action by ${message.author.tag}`,
          iconURL: message.guild.iconURL(),
        })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // Handle user-based addition (original logic)
    if (message.mentions.users.size === 0) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription(
          "**Usage**: `!addcoins @user <amount>` or `!addcoins @role <amount>`\n\n**Examples**:\n• `!addcoins @user 5000`\n• `!addcoins @VIP 1000`"
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    const target = message.mentions.users.first();

    if (target.bot) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Cannot Add Coins to Bots")
        .setDescription("You can't add coins to bots!")
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Get amount - it's the last argument after the mention
    const amountArg = args.find(
      (arg) => !arg.startsWith("<@") && !isNaN(parseInt(arg))
    );
    const amount = parseInt(amountArg);

    if (!amount || isNaN(amount) || amount <= 0) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Invalid Amount")
        .setDescription(
          "Please specify a valid positive amount!\n\n**Usage**: `!addcoins @user <amount>`\n**Example**: `!addcoins @user 50000`"
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Get or create target's economy data
    let targetData = await pvcEconomy.findOne({
      Guild: message.guild.id,
      User: target.id,
    });

    if (!targetData) {
      targetData = await new pvcEconomy({
        Guild: message.guild.id,
        User: target.id,
        Coins: 0,
      }).save();
    }

    // Add coins
    targetData.Coins += amount;
    targetData.TotalEarned += amount;
    await targetData.save();

    const embed = new Discord.EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("✅ Coins Added!")
      .setDescription(
        `${
          message.author
        } added **${amount.toLocaleString()}** coins to ${target}!`
      )
      .addFields(
        {
          name: "💰 Amount Added",
          value: `${amount.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "🏦 New Balance",
          value: `${targetData.Coins.toLocaleString()} coins`,
          inline: true,
        }
      )
      .setFooter({
        text: `Admin action by ${message.author.tag}`,
        iconURL: message.guild.iconURL(),
      })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("Error in PVC addcoins command:", err);
    message.reply("❌ An error occurred while adding coins.").catch(() => {});
  }
};
