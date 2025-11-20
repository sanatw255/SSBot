const Discord = require("discord.js");
const voiceChannels = require("../../database/models/voiceChannels");
const voiceSchema = require("../../database/models/voice");
const cooldowns = require("./cooldowns");

module.exports = async (client, message, args) => {
  if (message.author.bot) return;

  try {
    // Delete can be used in any channel
    const vcData = await voiceChannels.findOne({
      Guild: message.guild.id,
      Owner: message.author.id,
    });

    if (!vcData) return;

    const voiceChannel = message.guild.channels.cache.get(vcData.Channel);
    if (!voiceChannel) {
      return message.reply("❌ Your VC no longer exists!").catch(() => {});
    }

    // Confirm deletion
    const embed = new Discord.EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("⚠️ Confirm Deletion")
      .setDescription(
        `Are you sure you want to delete ${voiceChannel}?\n\n` +
          `**This action cannot be undone!**\n` +
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
        .edit({ content: "❌ Deletion cancelled (timeout).", embeds: [] })
        .catch(() => {});
    }

    const reaction = collected.first();
    if (reaction.emoji.name === "❌") {
      return confirmMsg
        .edit({ content: "❌ Deletion cancelled.", embeds: [] })
        .catch(() => {});
    }

    // Delete VC
    await voiceChannel.delete("Owner manually deleted VC").catch(() => {});
    await voiceChannels.deleteOne({ _id: vcData._id });

    // Clear rename cooldown
    cooldowns.clearCooldown(vcData.Channel);

    // Update channel count
    const voiceData = await voiceSchema.findOne({ Guild: message.guild.id });
    if (voiceData && voiceData.ChannelCount > 0) {
      voiceData.ChannelCount -= 1;
      await voiceData.save();
    }

    confirmMsg
      .edit({ content: "✅ Your VC has been deleted.", embeds: [] })
      .catch(() => {});
  } catch (err) {
    console.error("Error in PVC delete command:", err);
    message.reply("❌ Error deleting VC.").catch(() => {});
  }
};
