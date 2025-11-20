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
            // Check if this is a PVC channel (has ExpiresAt or IsPAYG)
            const isPVC = data2.ExpiresAt || data2.IsPAYG;
            
            if (isPVC) {
              // Don't delete PVC channels when empty - let the timer handle it
              console.log(`[VC] PVC channel ${channel?.name} is empty but has active timer, not deleting`);
              return;
            }

            // Only delete J2C channels when empty
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
                // Check if this is a PVC channel (has ExpiresAt or IsPAYG)
                const isPVC = oldChannelData.ExpiresAt || oldChannelData.IsPAYG;
                
                if (isPVC) {
                  // Don't delete PVC channels when empty - let the timer handle it
                  console.log(`[VC] PVC channel ${channel?.name} is empty but has active timer, not deleting`);
                } else {
                  // Only delete J2C channels when empty
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

          // Use user's name for PAYG VCs (like !create command)
          const channelName = `${user.username}'s VC`;

          const channel = await newState.guild.channels.create({
            name: "⌛",
            type: Discord.ChannelType.GuildVoice,
            parent: data.Category,
            permissionOverwrites: [
              {
                id: newState.guild.id, // @everyone
                deny: [Discord.PermissionFlagsBits.Connect],
              },
              {
                id: newState.id, // Channel owner
                allow: [
                  Discord.PermissionFlagsBits.Connect,
                  Discord.PermissionFlagsBits.Speak,
                  Discord.PermissionFlagsBits.Stream,
                  Discord.PermissionFlagsBits.ManageChannels,
                ],
              },
            ],
          });

          if (member.voice.setChannel(channel)) {
            await channel.edit({ name: channelName });
          }

          // Get PVC config for PAYG rate
          const pvcConfig = require("../../database/models/pvcConfig");
          const config = await pvcConfig.findOne({ Guild: guildID });
          const paygRate = config?.PAYGPerMinute || 60; // Default 60 coins/min

          // Create PAYG voice channel
          await new channelSchema({
            Guild: guildID,
            Channel: channel.id,
            Owner: newState.id,
            CreatedAt: new Date(),
            IsPAYG: true, // Enable PAYG mode for J2C
            ActiveSince: new Date(), // Track when user joined
            IsLocked: true, // Locked by default
            IsHidden: false,
            InvitedUsers: [],
            PaidDuration: 0,
            CoinsSpent: 0,
          }).save();

          // Send PAYG welcome message
          try {
            const embed = new Discord.EmbedBuilder()
              .setColor("#00BFFF")
              .setTitle("🎙️ Pay-As-You-Go Voice Channel")
              .setDescription(
                `Welcome to your temporary voice channel!\n\n` +
                  `**How it works:**\n` +
                  `• You're charged **${paygRate} coins per minute** while in the VC\n` +
                  `• Billing starts now and charges every 60 seconds\n` +
                  `• The channel will be deleted when you leave\n` +
                  `• If your balance runs out, you'll get a warning before deletion\n\n` +
                  `**Controls:**\n` +
                  `• Use the control panel in ${
                    config?.PanelChannel
                      ? `<#${config.PanelChannel}>`
                      : "the PVC channel"
                  } to manage your VC\n` +
                  `• Invite/Uninvite users, rename, lock/unlock, etc.\n\n` +
                  `💡 **Tip:** Check your balance with \`!bal\` in <#${
                    config?.EconomyChannel || "the economy channel"
                  }>`
              )
              .setFooter({ text: "Enjoy your session!" })
              .setTimestamp();

            await member.send({ embeds: [embed] }).catch(() => {
              // If DM fails, try sending in the VC (but it won't work in voice channels)
              // Just silently fail
            });
          } catch (error) {
            console.error("Error sending PAYG welcome message:", error);
          }
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
