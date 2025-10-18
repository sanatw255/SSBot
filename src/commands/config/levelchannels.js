const Discord = require("discord.js");
const Schema = require("../../database/models/levelChannels");

/**
 * /config levelchannels
 * action: add | remove | list | clear
 * channel: optional (required for add/remove)
 */
module.exports = async (client, interaction) => {
  console.log("[levelchannels] Command received from:", interaction.user.tag);

  try {
    // Check permissions first
    const canManage =
      interaction.member?.permissions?.has(
        Discord.PermissionsBitField.Flags.ManageGuild
      ) ||
      interaction.member?.permissions?.has(
        Discord.PermissionsBitField.Flags.Administrator
      );

    if (!canManage) {
      console.log("[levelchannels] User lacks ManageGuild permission");
      return await interaction.reply({
        content: "❌ You need **Manage Server** permission.",
        ephemeral: true,
      });
    }

    // Get options
    const action = interaction.options.getString("action");
    const channel = interaction.options.getChannel("channel");

    console.log(
      "[levelchannels] Action:",
      action,
      "Channel:",
      channel?.name || "none"
    );

    // Defer reply ASAP
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
      console.log("[levelchannels] Deferred reply");
    }

    // Fetch/create database record
    let data = await Schema.findOne({ Guild: interaction.guild.id });
    if (!data) {
      console.log(
        "[levelchannels] Creating new config for guild:",
        interaction.guild.id
      );
      data = await Schema.create({
        Guild: interaction.guild.id,
        Channels: [],
      });
    }
    console.log("[levelchannels] Current allowed channels:", data.Channels);

    if (action === "add") {
      if (!channel) {
        return await interaction.editReply({
          content: "❌ Please provide a **channel** to add.",
        });
      }

      const textChannelTypes = [
        Discord.ChannelType.GuildText,
        Discord.ChannelType.PublicThread,
        Discord.ChannelType.PrivateThread,
        Discord.ChannelType.AnnouncementThread,
      ];

      if (!textChannelTypes.includes(channel.type)) {
        console.log("[levelchannels] Invalid channel type:", channel.type);
        return await interaction.editReply({
          content: "❌ Only **text channels** or **threads** are supported.",
        });
      }

      if (data.Channels.includes(channel.id)) {
        console.log("[levelchannels] Channel already exists:", channel.id);
        return await interaction.editReply({
          content: `ℹ️ ${channel} is already in the allowed list.`,
        });
      }

      data.Channels.push(channel.id);
      await data.save();
      console.log("[levelchannels] Added channel:", channel.id);

      return await interaction.editReply({
        content: `✅ Added ${channel} to level channels. XP will only count there.`,
      });
    }

    if (action === "remove") {
      if (!channel) {
        return await interaction.editReply({
          content: "❌ Please provide a **channel** to remove.",
        });
      }

      if (!data.Channels.includes(channel.id)) {
        console.log("[levelchannels] Channel not in list:", channel.id);
        return await interaction.editReply({
          content: `ℹ️ ${channel} is not in the allowed list.`,
        });
      }

      data.Channels = data.Channels.filter((c) => c !== channel.id);
      await data.save();
      console.log("[levelchannels] Removed channel:", channel.id);

      return await interaction.editReply({
        content: `✅ Removed ${channel} from level channels.`,
      });
    }

    if (action === "list") {
      if (!data.Channels || data.Channels.length === 0) {
        console.log("[levelchannels] No channels set, using all");
        return await interaction.editReply({
          content:
            "ℹ️ **No restrictions set.** Leveling works in **all channels**.",
        });
      }

      const lines = data.Channels.map((cid) => {
        const ch = interaction.guild.channels.cache.get(cid);
        return `<#${cid}>` + (ch ? ` (${ch.name})` : " (deleted)");
      }).join("\n");

      console.log("[levelchannels] Listed channels");
      return await interaction.editReply({
        content: `📺 **XP awarded only in:**\n${lines}`,
      });
    }

    if (action === "clear") {
      data.Channels = [];
      await data.save();
      console.log("[levelchannels] Cleared all channels");

      return await interaction.editReply({
        content: "✅ Cleared restrictions. XP now works in **all channels**.",
      });
    }

    console.log("[levelchannels] Invalid action:", action);
    return await interaction.editReply({
      content: "❌ Invalid action. Use: `add` | `remove` | `list` | `clear`",
    });
  } catch (error) {
    console.error("[levelchannels] ERROR:", error.message);
    console.error(error.stack);

    try {
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({
          content: `❌ **Error:** ${error.message}`,
          ephemeral: true,
        });
      } else {
        return await interaction.editReply({
          content: `❌ **Error:** ${error.message}`,
        });
      }
    } catch (replyError) {
      console.error(
        "[levelchannels] Failed to send error reply:",
        replyError.message
      );
    }
  }
};
