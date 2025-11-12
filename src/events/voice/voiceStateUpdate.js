const Discord = require("discord.js");
const voiceSchema = require("../../database/models/voice");
const channelSchema = require("../../database/models/voiceChannels");

module.exports = async (client, oldState, newState) => {
  if (oldState.channelId == newState.channelId) {
    if (oldState.serverDeaf == false && newState.selfDeaf == true) return;
    if (oldState.serverDeaf == true && newState.selfDeaf == false) return;
    if (oldState.serverMute == false && newState.serverMute == true) return;
    if (oldState.serverMute == true && newState.serverMute == false) return;
    if (oldState.selfDeaf == false && newState.selfDeaf == true) return;
    if (oldState.selfDeaf == true && newState.selfDeaf == false) return;
    if (oldState.selfMute == false && newState.selfMute == true) return;
    if (oldState.selfMute == true && newState.selfMute == false) return;
    if (oldState.selfVideo == false && newState.selfVideo == true) return;
    if (oldState.selfVideo == true && newState.selfVideo == false) return;
    if (oldState.streaming == false && newState.streaming == true) return;
    if (oldState.streaming == true && newState.streaming == false) return;
  }

  const guildID = newState.guild.id || oldState.guild.id;

  try {
    const data = await voiceSchema.findOne({ Guild: guildID });

    if (data) {
      // Handle channel cleanup when user leaves
      const data2 = await channelSchema.findOne({
        Guild: guildID,
        Channel: oldState.channelId,
      });

      if (data2) {
        try {
          const channel = client.channels.cache.get(data2.Channel);
          const memberCount = channel?.members.size || 0;

          if (memberCount < 1 || memberCount == 0) {
            if (data.ChannelCount) {
              try {
                data.ChannelCount -= 1;
                await data.save();
              } catch (e) {
                console.error("Error saving channel count:", e);
              }
            }

            try {
              await channelSchema.deleteOne({ Channel: oldState.channelId });
              if (oldState.channel) {
                await oldState.channel
                  .delete()
                  .catch((e) => console.error("Error deleting channel:", e));
              }
            } catch (e) {
              console.error("Error in channel cleanup:", e);
            }
          }
        } catch (e) {
          console.error("Error processing old channel:", e);
        }
      }

      try {
        const user = await client.users.fetch(newState.id);
        const member = newState.guild.members.cache.get(user.id);

        if (newState.channel && newState.channel.id === data.Channel) {
          // User joined the "join to create" channel
          const oldChannelData = await channelSchema.findOne({
            Guild: guildID,
            Channel: oldState.channelId,
          });

          if (oldChannelData) {
            try {
              const channel = client.channels.cache.get(oldChannelData.Channel);
              const memberCount = channel?.members.size || 0;

              if (memberCount < 1 || memberCount == 0) {
                if (data.ChannelCount) {
                  try {
                    data.ChannelCount -= 1;
                    await data.save();
                  } catch (e) {
                    console.error("Error saving channel count:", e);
                  }
                }

                try {
                  await channelSchema.deleteOne({
                    Channel: oldState.channelId,
                  });
                  if (oldState.channel) {
                    await oldState.channel
                      .delete()
                      .catch((e) =>
                        console.error("Error deleting channel:", e)
                      );
                  }
                } catch (e) {
                  console.error("Error in old channel cleanup:", e);
                }
              }
            } catch (e) {
              console.error("Error processing old channel data:", e);
            }
          }

          if (data.ChannelCount) {
            data.ChannelCount += 1;
          } else {
            data.ChannelCount = 1;
          }
          await data.save();

          let channelName = data.ChannelName;
          channelName = channelName.replace(`{emoji}`, "🔊");
          channelName = channelName.replace(
            `{channel name}`,
            `Voice ${data.ChannelCount}`
          );
          channelName = channelName.replace(
            `{channel count}`,
            `${data.ChannelCount}`
          );
          channelName = channelName.replace(`{member}`, `${user.username}`);
          channelName = channelName.replace(`{member tag}`, `${user.tag}`);

          const channel = await newState.guild.channels.create({
            name: "⌛",
            type: Discord.ChannelType.GuildVoice,
            parent: data.Category,
          });

          if (member.voice.setChannel(channel)) {
            await channel.edit({ name: channelName });
          }

          await new channelSchema({
            Guild: guildID,
            Channel: channel.id,
          }).save();
        } else {
          // User moved to different channel
          const oldChannelData = await channelSchema.findOne({
            Guild: guildID,
            Channel: oldState.channelId,
          });

          if (oldChannelData) {
            try {
              const channel = client.channels.cache.get(oldChannelData.Channel);
              const memberCount = channel?.members.size || 0;

              if (memberCount < 1 || memberCount == 0) {
                if (data.ChannelCount) {
                  try {
                    data.ChannelCount -= 1;
                    await data.save();
                  } catch (e) {
                    console.error("Error saving channel count:", e);
                  }
                }

                try {
                  await channelSchema.deleteOne({
                    Channel: oldState.channelId,
                  });
                  if (oldState.channel) {
                    await oldState.channel
                      .delete()
                      .catch((e) =>
                        console.error("Error deleting channel:", e)
                      );
                  }
                } catch (e) {
                  console.error("Error in channel cleanup:", e);
                }
              }
            } catch (e) {
              console.error("Error processing channel data:", e);
            }
          }
        }
      } catch (e) {
        console.error("Error in voice state update:", e);
      }
    }
  } catch (err) {
    console.error("Error in voiceStateUpdate event:", err);
  }
};
