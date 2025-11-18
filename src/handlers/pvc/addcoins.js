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

    if (message.mentions.users.size === 0) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription(
          "**Usage**: `!addcoins @user <amount>`\n\n**Example**: `!addcoins @user 5000`"
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
