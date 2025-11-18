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
          .setColor(client.config.colors.error || "#FF0000")
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
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription("**Usage**: `!vui @user1 @user2...`")
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    const voiceChannel = message.guild.channels.cache.get(vcData.Channel);
    if (!voiceChannel) {
      return message.reply("❌ Your VC no longer exists!").catch(() => {});
    }

    const removed = [];

    for (const user of message.mentions.users.values()) {
      const index = vcData.InvitedUsers.indexOf(user.id);
      if (index > -1) {
        vcData.InvitedUsers.splice(index, 1);
        removed.push(user);

        // Remove Connect permission & disconnect if in VC
        await voiceChannel.permissionOverwrites.delete(user.id).catch(() => {});

        const member = message.guild.members.cache.get(user.id);
        if (member && member.voice.channelId === voiceChannel.id) {
          await member.voice.disconnect("Uninvited from PVC").catch(() => {});
        }
      }
    }

    await vcData.save();

    if (removed.length > 0) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.success || "#00FF00")
        .setTitle("✅ Users Uninvited")
        .setDescription(
          `Removed users from ${voiceChannel}:\n${removed
            .map((u) => `• ${u}`)
            .join("\n")}`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      message.reply({ embeds: [embed] });
    }
  } catch (err) {
    console.error("Error in PVC uninvite command:", err);
    message.reply("❌ Error uninviting users.").catch(() => {});
  }
};
