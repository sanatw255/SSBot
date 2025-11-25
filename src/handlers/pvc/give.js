const Discord = require("discord.js");
const pvcEconomy = require("../../database/models/pvcEconomy");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, message, args) => {
  // Ignore bots
  if (message.author.bot) return;

  try {
    // Check if PVC economy is configured
    const config = await pvcConfig.findOne({ Guild: message.guild.id });

    if (!config || !config.EconomyChannel) {
      return; // Silently ignore if not configured
    }

    // Check if command is in the correct channel
    if (message.channel.id !== config.EconomyChannel) {
      return; // Silently ignore if wrong channel
    }

    // Check if user mentioned someone
    if (message.mentions.users.size === 0) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription(
          "Please mention a user to gift coins to!\n\n**Usage**: `!give @user <amount>`"
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    const recipient = message.mentions.users.first();

    // Prevent gifting to self
    if (recipient.id === message.author.id) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Cannot Gift to Yourself")
        .setDescription("You can't gift coins to yourself!")
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Prevent gifting to bots
    if (recipient.bot) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Cannot Gift to Bots")
        .setDescription("You can't gift coins to bots!")
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Get amount from args (args[0] = !give, args[1] = @mention, args[2] = amount)
    const amount = parseInt(args[2]);
    if (!amount || isNaN(amount) || amount <= 0) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Invalid Amount")
        .setDescription(
          "Please specify a valid amount of coins to gift!\n\n**Usage**: `!give @user <amount>`"
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Minimum gift amount (prevent spam)
    if (amount < 100) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Amount Too Low")
        .setDescription("Minimum gift amount is **100 coins**!")
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Get sender's economy data
    let senderData = await pvcEconomy.findOne({
      Guild: message.guild.id,
      User: message.author.id,
    });

    if (!senderData) {
      senderData = await new pvcEconomy({
        Guild: message.guild.id,
        User: message.author.id,
        Coins: 0,
      }).save();
    }

    // Check if sender has enough coins
    if (senderData.Coins < amount) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Insufficient Balance")
        .setDescription(
          `You don't have enough coins!\n\n` +
            `**Your Balance**: ${senderData.Coins.toLocaleString()} coins\n` +
            `**Needed**: ${amount.toLocaleString()} coins\n` +
            `**Short by**: ${(
              amount - senderData.Coins
            ).toLocaleString()} coins`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Get or create recipient's economy data
    let recipientData = await pvcEconomy.findOne({
      Guild: message.guild.id,
      User: recipient.id,
    });

    if (!recipientData) {
      recipientData = await new pvcEconomy({
        Guild: message.guild.id,
        User: recipient.id,
        Coins: 0,
      }).save();
    }

    // Transfer coins
    senderData.Coins -= amount;
    senderData.TotalGifted += amount;
    recipientData.Coins += amount;
    recipientData.TotalReceived += amount;

    await senderData.save();
    await recipientData.save();

    // Send success message
    const embed = new Discord.EmbedBuilder()
      .setColor(client.config.colors.success || "#00FF00")
      .setTitle("🎁 Gift Sent!")
      .setDescription(
        `${
          message.author
        } gifted **${amount.toLocaleString()}** coins to ${recipient}!`
      )
      .addFields(
        {
          name: `💸 ${message.author.username}'s Balance`,
          value: `${senderData.Coins.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: `💰 ${recipient.username}'s Balance`,
          value: `${recipientData.Coins.toLocaleString()} coins`,
          inline: true,
        }
      )
      .setFooter({
        text: "What a generous gift!",
        iconURL: message.guild.iconURL(),
      })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("Error in PVC give command:", err);
    message
      .reply("❌ An error occurred while processing your gift.")
      .catch(() => {});
  }
};
