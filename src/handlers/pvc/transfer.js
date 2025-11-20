const Discord = require("discord.js");
const voiceChannels = require("../../database/models/voiceChannels");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, message, args) => {
  if (message.author.bot) return;

  try {
    const config = await pvcConfig.findOne({ Guild: message.guild.id });
    if (!config) return;

    // Check if in commands channel
    if (
      config.CommandsChannel &&
      message.channel.id !== config.CommandsChannel
    ) {
      return; // Silently ignore if wrong channel
    }

    const vcData = await voiceChannels.findOne({
      Guild: message.guild.id,
      Owner: message.author.id,
    });

    if (!vcData) {
      if (message.channel.id === config.CommandsChannel) {
        const embed = new Discord.EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("❌ No Active VC")
          .setDescription("You don't have an active VC!")
          .setFooter({
            text: message.guild.name,
            iconURL: message.guild.iconURL(),
          });

        return message.reply({ embeds: [embed] }).then((msg) => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
      }
      return;
    }

    if (message.mentions.users.size === 0) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription(
          "**Usage**: `!transfer @user`\n\nTransfer ownership of your VC to another user."
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    const newOwner = message.mentions.users.first();

    if (newOwner.bot) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Cannot Transfer to Bot")
        .setDescription("You can't transfer ownership to a bot!")
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    if (newOwner.id === message.author.id) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Already Owner")
        .setDescription("You're already the owner!")
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Check if new owner already has an active VC
    const existingVC = await voiceChannels.findOne({
      Guild: message.guild.id,
      Owner: newOwner.id,
    });

    if (existingVC) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ User Already Has VC")
        .setDescription(
          `${newOwner} already has an active voice channel!\n\nThey must delete their VC first.`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      });
    }

    const voiceChannel = message.guild.channels.cache.get(vcData.Channel);
    if (!voiceChannel) {
      return message.reply("❌ Your VC no longer exists!").catch(() => {});
    }

    // Confirm transfer
    const embed = new Discord.EmbedBuilder()
      .setColor("#FFA500")
      .setTitle("⚠️ Confirm Ownership Transfer")
      .setDescription(
        `Are you sure you want to transfer ownership of ${voiceChannel} to ${newOwner}?\n\n` +
          `**You will lose all control over this VC and can create a new one.**\n\n` +
          `React with ✅ to confirm or ❌ to cancel.`
      )
      .setFooter({
        text: "You have 15 seconds to respond",
        iconURL: message.guild.iconURL(),
      });

    const confirmMsg = await message.reply({ embeds: [embed] });
    await confirmMsg.react("✅");
    await confirmMsg.react("❌");

    const filter = (reaction, user) =>
      ["✅", "❌"].includes(reaction.emoji.name) &&
      user.id === message.author.id;

    const collected = await confirmMsg
      .awaitReactions({ filter, max: 1, time: 15000 })
      .catch(() => null);

    if (!collected || collected.size === 0) {
      return confirmMsg
        .edit({ content: "❌ Transfer cancelled (timeout).", embeds: [] })
        .catch(() => {});
    }

    const reaction = collected.first();
    if (reaction.emoji.name === "❌") {
      return confirmMsg
        .edit({ content: "❌ Transfer cancelled.", embeds: [] })
        .catch(() => {});
    }

    let billingMessage = "";

    // Handle PAYG billing transfer
    if (vcData.IsPAYG) {
      const pvcConfig = require("../../database/models/pvcConfig");
      const pvcEconomy = require("../../database/models/pvcEconomy");

      const configData = await pvcConfig.findOne({ Guild: message.guild.id });
      const paygRate = configData?.PAYGPerMinute || 60;

      // Calculate old owner's cost
      const activeSince = vcData.ActiveSince || vcData.CreatedAt;
      const now = new Date();
      const elapsed = now - activeSince.getTime();
      const minutesElapsed = Math.floor(elapsed / (1000 * 60));
      const totalCost = minutesElapsed * paygRate;

      // Deduct from old owner
      const oldOwnerData = await pvcEconomy.findOne({
        Guild: message.guild.id,
        User: message.author.id,
      });

      if (oldOwnerData && totalCost > 0) {
        oldOwnerData.Coins = Math.max(0, oldOwnerData.Coins - totalCost);
        oldOwnerData.TotalSpent += totalCost;
        await oldOwnerData.save();

        vcData.CoinsSpent += totalCost;
        billingMessage = `\n\n💰 **Your Final Bill:** ${totalCost.toLocaleString()} coins (${minutesElapsed} minutes)`;
      }

      // Reset billing for new owner
      vcData.ActiveSince = new Date(); // New owner's billing starts now
      vcData.LastPAYGDeduction = null;
    }

    // Transfer ownership
    vcData.Owner = newOwner.id;
    await vcData.save();

    // Update permissions
    await voiceChannel.permissionOverwrites
      .edit(message.author.id, {
        Connect: null,
        Speak: null,
        Stream: null,
        ManageChannels: null,
      })
      .catch(() => {});

    await voiceChannel.permissionOverwrites
      .edit(newOwner.id, {
        Connect: true,
        Speak: true,
        Stream: true,
        ManageChannels: true,
      })
      .catch(() => {});

    // Notify new owner
    try {
      await newOwner.send({
        embeds: [
          new Discord.EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("👑 VC Ownership Transferred!")
            .setDescription(
              `${message.author} has transferred ownership of **${voiceChannel.name}** to you!\n\n` +
                `You now have full control over this voice channel.`
            )
            .setTimestamp(),
        ],
      });
    } catch (e) {
      // Can't DM user
    }

    const successEmbed = new Discord.EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("✅ Ownership Transferred!")
      .setDescription(
        `Ownership of ${voiceChannel} has been transferred to ${newOwner}!${billingMessage}\n\n` +
          `You can now create a new VC with \`!create <duration>\`.`
      )
      .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
      .setTimestamp();

    confirmMsg.edit({ content: null, embeds: [successEmbed] });
  } catch (err) {
    console.error("Error in PVC transfer command:", err);
    message.reply("❌ Error transferring ownership.").catch(() => {});
  }
};
