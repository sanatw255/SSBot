const Discord = require("discord.js");
const voiceChannels = require("../../database/models/voiceChannels");
const pvcEconomy = require("../../database/models/pvcEconomy");
const pvcConfig = require("../../database/models/pvcConfig");
const voiceSchema = require("../../database/models/voice");
const cooldowns = require("./cooldowns");

/**
 * PVC Timer System
 * Runs every minute to:
 * 1. Delete expired VCs
 * 2. Deduct coins for PAYG VCs
 * 3. Kick users when balance reaches 0
 */

module.exports = async (client) => {
  setInterval(async () => {
    try {
      // Get all active VCs
      const activeVCs = await voiceChannels.find({});

      for (const vcData of activeVCs) {
        try {
          const guild = client.guilds.cache.get(vcData.Guild);
          if (!guild) continue;

          const voiceChannel = guild.channels.cache.get(vcData.Channel);
          if (!voiceChannel) {
            // Channel doesn't exist, remove from database
            await voiceChannels.deleteOne({ _id: vcData._id });
            cooldowns.clearCooldown(vcData.Channel);
            continue;
          }

          // Check if VC is empty (only applies to PAID VCs that expired)
          const memberCount = voiceChannel.members.size;

          // PAID VC - Check expiry
          if (!vcData.IsPAYG && vcData.ExpiresAt) {
            if (new Date() >= vcData.ExpiresAt) {
              // VC has expired
              try {
                // Calculate session duration
                const sessionStart = vcData.CreatedAt;
                const sessionEnd = new Date();
                const sessionMinutes = Math.floor(
                  (sessionEnd - sessionStart) / (1000 * 60)
                );
                const totalSpent = vcData.CoinsSpent || 0;

                // Get owner and their balance
                const owner = await guild.members
                  .fetch(vcData.Owner)
                  .catch(() => null);

                let currentBalance = 0;
                if (owner) {
                  const pvcEconomy = require("../../database/models/pvcEconomy");
                  const userData = await pvcEconomy.findOne({
                    Guild: vcData.Guild,
                    User: vcData.Owner,
                  });
                  currentBalance = userData?.Coins || 0;
                }

                // Notify owner about session end
                if (owner) {
                  const summaryEmbed = new Discord.EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("⏰ Your VC Session Ended")
                    .setDescription(
                      `Your private voice channel **${voiceChannel.name}** has expired and been deleted.\n\n` +
                        `📊 **Session Summary:**\n` +
                        `⏱️ Duration: **${sessionMinutes} minutes**\n` +
                        `💰 Total Spent: **${totalSpent.toLocaleString()} coins**\n` +
                        `💵 Current Balance: **${currentBalance.toLocaleString()} coins**\n\n` +
                        `Use \`!create <duration>\` to create a new one!`
                    )
                    .setTimestamp();

                  try {
                    await owner.send({ embeds: [summaryEmbed] });
                  } catch (e) {
                    // Can't DM user, try posting in commands channel
                    const pvcConfig = require("../../database/models/pvcConfig");
                    const config = await pvcConfig.findOne({
                      Guild: vcData.Guild,
                    });
                    if (config?.CommandsChannel) {
                      const commandsChannel = guild.channels.cache.get(
                        config.CommandsChannel
                      );
                      if (commandsChannel) {
                        await commandsChannel
                          .send({
                            content: `${owner}`,
                            embeds: [summaryEmbed],
                          })
                          .catch(() => {});
                      }
                    }
                  }
                }

                // Delete VC
                await voiceChannel.delete("VC time expired");

                // Delete from database
                await voiceChannels.deleteOne({ _id: vcData._id });
                cooldowns.clearCooldown(vcData.Channel);

                // Update channel count
                const voiceData = await voiceSchema.findOne({
                  Guild: vcData.Guild,
                });
                if (voiceData && voiceData.ChannelCount > 0) {
                  voiceData.ChannelCount -= 1;
                  await voiceData.save();
                }

                console.log(
                  `[PVC Timer] Deleted expired VC: ${voiceChannel.name} (${vcData.Channel})`
                );
              } catch (err) {
                console.error(`[PVC Timer] Error deleting expired VC:`, err);
              }
            }
          }

          // PAYG VC - Deduct coins every minute
          if (vcData.IsPAYG && memberCount > 0) {
            const config = await pvcConfig.findOne({ Guild: vcData.Guild });
            if (!config) continue;

            // Check if it's been at least 1 minute since last deduction
            const now = new Date();
            const lastDeduction = vcData.LastPAYGDeduction || vcData.CreatedAt;
            const minutesSinceLastDeduction =
              (now - lastDeduction) / (1000 * 60);

            if (minutesSinceLastDeduction >= 1) {
              // Get owner's balance
              const userData = await pvcEconomy.findOne({
                Guild: vcData.Guild,
                User: vcData.Owner,
              });

              if (!userData || userData.Coins < config.PAYGPerMinute) {
                // Check if warning was already sent
                const warningGiven = vcData.PAYGWarningGiven || false;

                if (!warningGiven && userData && userData.Coins > 0) {
                  // Send warning - user has some coins but not enough
                  try {
                    const owner = await guild.members
                      .fetch(vcData.Owner)
                      .catch(() => null);

                    if (owner) {
                      await owner
                        .send({
                          embeds: [
                            new Discord.EmbedBuilder()
                              .setColor("#FFA500")
                              .setTitle("⚠️ Low Balance Warning")
                              .setDescription(
                                `Your balance is too low to continue using your PAYG voice channel!\n\n` +
                                  `**Required**: ${config.PAYGPerMinute} coins/min\n` +
                                  `**Your Balance**: ${userData.Coins} coins\n\n` +
                                  `**You have 1 minute to:**\n` +
                                  `• Use \`!work\` or \`!daily\` to earn coins\n` +
                                  `• Have someone \`!give\` you coins\n` +
                                  `• Or your VC will be deleted!\n\n` +
                                  `💡 Need more? Use \`!bal\` to check your balance.`
                              )
                              .setTimestamp(),
                          ],
                        })
                        .catch(() => {});
                    }

                    // Mark warning as given
                    vcData.PAYGWarningGiven = true;
                    await vcData.save();

                    console.log(
                      `[PVC PAYG] Sent low balance warning to ${vcData.Owner}`
                    );
                  } catch (err) {
                    console.error(`[PVC PAYG] Error sending warning:`, err);
                  }

                  // Don't delete yet, give them 1 more minute
                  continue;
                }

                // Insufficient balance - kick owner and delete VC
                try {
                  const owner = await guild.members
                    .fetch(vcData.Owner)
                    .catch(() => null);

                  if (owner) {
                    // Try to DM owner
                    try {
                      await owner.send({
                        embeds: [
                          new Discord.EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ Insufficient Balance")
                            .setDescription(
                              `Your PAYG voice channel **${voiceChannel.name}** has been deleted because you ran out of coins!\n\n` +
                                `**Cost**: ${config.PAYGPerMinute} coins/min\n` +
                                `**Your Balance**: ${
                                  userData ? userData.Coins : 0
                                } coins\n\n` +
                                `Use \`!work\` and \`!daily\` to earn more coins, then \`!create <duration>\` to create a new VC!`
                            )
                            .setTimestamp(),
                        ],
                      });
                    } catch (e) {
                      // Can't DM user
                    }

                    // Disconnect owner from VC
                    if (voiceChannel.members.has(owner.id)) {
                      await owner.voice.disconnect(
                        "Insufficient coins for PAYG"
                      );
                    }
                  }

                  // Delete VC
                  await voiceChannel.delete("PAYG - Insufficient balance");

                  // Delete from database
                  await voiceChannels.deleteOne({ _id: vcData._id });
                  cooldowns.clearCooldown(vcData.Channel);

                  // Update channel count
                  const voiceData = await voiceSchema.findOne({
                    Guild: vcData.Guild,
                  });
                  if (voiceData && voiceData.ChannelCount > 0) {
                    voiceData.ChannelCount -= 1;
                    await voiceData.save();
                  }

                  console.log(
                    `[PVC PAYG] Deleted VC due to insufficient balance: ${voiceChannel.name}`
                  );
                } catch (err) {
                  console.error(`[PVC PAYG] Error deleting VC:`, err);
                }
              } else {
                // Deduct coins
                userData.Coins -= config.PAYGPerMinute;
                userData.TotalSpent += config.PAYGPerMinute;
                await userData.save();

                // Update last deduction time and reset warning
                vcData.LastPAYGDeduction = now;
                vcData.CoinsSpent += config.PAYGPerMinute;
                vcData.PAYGWarningGiven = false; // Reset warning for next time
                await vcData.save();

                console.log(
                  `[PVC PAYG] Deducted ${config.PAYGPerMinute} coins from ${vcData.Owner} (${userData.Coins} remaining)`
                );
              }
            }
          }

          // Check if PAYG VC is empty (all members left)
          if (vcData.IsPAYG && memberCount === 0) {
            // Delete immediately when empty
            try {
              // Get session stats (coins already deducted, just calculate duration)
              const activeSince = vcData.ActiveSince || vcData.CreatedAt;
              const now = new Date();
              const elapsed = now - activeSince.getTime();
              const minutesElapsed = Math.floor(elapsed / (1000 * 60));
              const totalSpent = vcData.CoinsSpent || 0; // Already deducted

              // Get owner's current balance
              const userData = await pvcEconomy.findOne({
                Guild: vcData.Guild,
                User: vcData.Owner,
              });

              const currentBalance = userData?.Coins || 0;

              // Send billing summary to owner
              const owner = await guild.members
                .fetch(vcData.Owner)
                .catch(() => null);

              if (owner) {
                const summaryEmbed = new Discord.EmbedBuilder()
                  .setColor("#00FF00")
                  .setTitle("📊 Your VC Session Ended")
                  .setDescription(
                    `Your Pay-As-You-Go voice channel **${voiceChannel.name}** has been deleted because it was empty.\n\n` +
                      `📊 **Session Summary:**\n` +
                      `⏱️ Duration: **${minutesElapsed} minutes**\n` +
                      `💰 Total Cost: **${totalSpent.toLocaleString()} coins**\n` +
                      `💵 Current Balance: **${currentBalance.toLocaleString()} coins**\n\n` +
                      `Join the J2C channel to create a new PAYG VC!`
                  )
                  .setTimestamp();

                try {
                  await owner.send({ embeds: [summaryEmbed] });
                } catch (e) {
                  // Can't DM user, try posting in commands channel
                  const config = await pvcConfig.findOne({
                    Guild: vcData.Guild,
                  });
                  if (config?.CommandsChannel) {
                    const commandsChannel = guild.channels.cache.get(
                      config.CommandsChannel
                    );
                    if (commandsChannel) {
                      await commandsChannel
                        .send({
                          content: `${owner}`,
                          embeds: [summaryEmbed],
                        })
                        .catch(() => {});
                    }
                  }
                }
              }

              // Delete VC
              await voiceChannel.delete("PAYG VC empty - all users left");
              await voiceChannels.deleteOne({ _id: vcData._id });
              cooldowns.clearCooldown(vcData.Channel);

              // Update channel count
              const voiceData = await voiceSchema.findOne({
                Guild: vcData.Guild,
              });
              if (voiceData && voiceData.ChannelCount > 0) {
                voiceData.ChannelCount -= 1;
                await voiceData.save();
              }

              console.log(
                `[PVC PAYG] Deleted empty PAYG VC: ${voiceChannel.name} (Total cost: ${totalSpent} coins, Duration: ${minutesElapsed}min)`
              );
            } catch (err) {
              console.error(`[PVC PAYG] Error deleting empty VC:`, err);
            }
          }
        } catch (err) {
          console.error(`[PVC Timer] Error processing VC:`, err);
        }
      }
    } catch (err) {
      console.error("[PVC Timer] Critical error in timer:", err);
    }
  }, 60000); // Run every minute

  console.log("[PVC Timer] Started PVC timer system (checks every 60 seconds)");
};
