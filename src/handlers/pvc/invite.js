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
          .setDescription(
            "You don't have an active VC!\n\nUse `!create <duration>` first."
          )
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
        .setDescription(
          "**Usage**: `!vi @user1 @user2...`\n\nMention users to invite to your VC."
        )
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

    const invited = [];
    const alreadyInvited = [];

    for (const user of message.mentions.users.values()) {
      if (user.bot) continue;
      if (user.id === message.author.id) continue;

      if (vcData.InvitedUsers.includes(user.id)) {
        alreadyInvited.push(user);
      } else {
        vcData.InvitedUsers.push(user.id);
        invited.push(user);

        // Grant permissions (including ViewChannel for hidden VCs)
        await voiceChannel.permissionOverwrites
          .edit(user.id, {
            ViewChannel: true,
            Connect: true,
            Speak: true,
            Stream: true,
          })
          .catch(() => {});
      }
    }

    await vcData.save();

    const embed = new Discord.EmbedBuilder()
      .setColor(client.config.colors.success || "#00FF00")
      .setTitle("✅ Users Invited");

    if (invited.length > 0) {
      embed.setDescription(
        `Invited users to ${voiceChannel}:\n${invited
          .map((u) => `• ${u}`)
          .join("\n")}`
      );
    }

    if (alreadyInvited.length > 0) {
      embed.addFields({
        name: "Already Invited",
        value: alreadyInvited.map((u) => `• ${u}`).join("\n"),
      });
    }

    embed.setFooter({
      text: message.guild.name,
      iconURL: message.guild.iconURL(),
    });
    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("Error in PVC invite command:", err);
    message.reply("❌ Error inviting users.").catch(() => {});
  }
};
