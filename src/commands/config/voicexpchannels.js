const Discord = require("discord.js");
const voiceXPChannels = require("../../database/models/voiceXPChannels");

module.exports = async (client, interaction, args) => {
  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageGuild],
      perms: [Discord.PermissionsBitField.Flags.ManageGuild],
    },
    interaction
  );

  if (perms == false) return;

  const action = interaction.options.getString("action");
  const channel = interaction.options.getChannel("channel");

  console.log(
    `[voicexpchannels] Command received from: ${interaction.user.username}`
  );
  console.log(
    `[voicexpchannels] Action: ${action}, Channel: ${
      channel ? channel.name : "none"
    }`
  );

  try {
    let data = await voiceXPChannels.findOne({ Guild: interaction.guild.id });

    if (!data) {
      data = new voiceXPChannels({
        Guild: interaction.guild.id,
        Channels: [],
      });
    }

    console.log(`[voicexpchannels] Current allowed channels:`, data.Channels);

    switch (action) {
      case "add": {
        if (!channel) {
          return client.errNormal(
            {
              error: "Please provide a voice channel or category!",
              type: "editreply",
            },
            interaction
          );
        }

        // Check if it's a voice channel or category
        const isVoiceChannel = channel.type === Discord.ChannelType.GuildVoice;
        const isCategory = channel.type === Discord.ChannelType.GuildCategory;

        if (!isVoiceChannel && !isCategory) {
          return client.errNormal(
            {
              error: "Please select a voice channel or category!",
              type: "editreply",
            },
            interaction
          );
        }

        if (data.Channels.includes(channel.id)) {
          return client.errNormal(
            {
              error: `${channel.name} is already in the voice XP channels list!`,
              type: "editreply",
            },
            interaction
          );
        }

        data.Channels.push(channel.id);
        await data.save();
        console.log(
          `[voicexpchannels] Added channel: ${channel.name} (${channel.id})`
        );

        client.succNormal(
          {
            text: `${isCategory ? "Category" : "Voice channel"} ${
              channel.name
            } will now grant XP!`,
            type: "editreply",
          },
          interaction
        );
        break;
      }

      case "remove": {
        if (!channel) {
          return client.errNormal(
            {
              error: "Please provide a channel or category to remove!",
              type: "editreply",
            },
            interaction
          );
        }

        if (!data.Channels.includes(channel.id)) {
          return client.errNormal(
            {
              error: `${channel.name} is not in the voice XP channels list!`,
              type: "editreply",
            },
            interaction
          );
        }

        data.Channels = data.Channels.filter((c) => c !== channel.id);
        await data.save();
        console.log(
          `[voicexpchannels] Removed channel: ${channel.name} (${channel.id})`
        );

        client.succNormal(
          {
            text: `${channel.name} will no longer grant XP!`,
            type: "editreply",
          },
          interaction
        );
        break;
      }

      case "list": {
        if (!data.Channels || data.Channels.length === 0) {
          return client.errNormal(
            {
              error:
                "No voice channels configured! XP will be granted in ALL voice channels.",
              type: "editreply",
            },
            interaction
          );
        }

        const channelsList = data.Channels.map((channelId) => {
          const guildChannel = interaction.guild.channels.cache.get(channelId);
          if (guildChannel) {
            const type =
              guildChannel.type === Discord.ChannelType.GuildCategory
                ? "📁"
                : "🔊";
            return `${type} ${guildChannel.name}`;
          }
          return `❌ Deleted Channel (${channelId})`;
        }).join("\n");

        const embed = new Discord.EmbedBuilder()
          .setTitle("🎙️ Voice XP Channels")
          .setDescription(
            `XP will be granted in these channels/categories:\n\n${channelsList}`
          )
          .setColor(client.config.colors.normal)
          .setTimestamp()
          .setFooter({ text: `Requested by ${interaction.user.username}` });

        interaction.editReply({ embeds: [embed] });
        break;
      }

      case "clear": {
        if (!data.Channels || data.Channels.length === 0) {
          return client.errNormal(
            {
              error: "No channels are currently configured!",
              type: "editreply",
            },
            interaction
          );
        }

        data.Channels = [];
        await data.save();
        console.log(`[voicexpchannels] Cleared all channels`);

        client.succNormal(
          {
            text: "XP will now be granted in ALL voice channels!",
            type: "editreply",
          },
          interaction
        );
        break;
      }

      default: {
        client.errNormal(
          {
            error: "Invalid action!",
            type: "editreply",
          },
          interaction
        );
      }
    }
  } catch (error) {
    console.error("[voicexpchannels] Error:", error);
    client.errNormal(
      {
        error: "An error occurred while managing voice XP channels!",
        type: "editreply",
      },
      interaction
    );
  }
};
