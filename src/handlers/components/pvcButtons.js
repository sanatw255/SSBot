const Discord = require("discord.js");
const voiceChannels = require("../../database/models/voiceChannels");
const pvcEconomy = require("../../database/models/pvcEconomy");
const pvcConfig = require("../../database/models/pvcConfig");
const cooldowns = require("../pvc/cooldowns");

module.exports = async (client, interaction) => {
  // Skip if called during bot initialization
  if (!interaction || !interaction.customId) return;

  const customId = interaction.customId;

  // Only handle PVC panel buttons
  if (!customId.startsWith("pvc_")) return;

  const guildID = interaction.guild.id;
  const userID = interaction.user.id;

  try {
    // Verify user owns a VC
    const vcData = await voiceChannels.findOne({
      Guild: guildID,
      Owner: userID,
    });

    if (!vcData) {
      return interaction.reply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription(
              "❌ You don't have an active Private Voice Channel!"
            )
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    const voiceChannel = interaction.guild.channels.cache.get(vcData.Channel);
    if (!voiceChannel) {
      await voiceChannels.deleteOne({ Guild: guildID, Owner: userID });
      return interaction.reply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ Your VC no longer exists!")
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    // Handle different button actions
    switch (customId) {
      case "pvc_extend":
        await handleExtend(client, interaction, vcData, voiceChannel);
        break;

      case "pvc_auto":
        await handleAutoToggle(client, interaction, vcData, voiceChannel);
        break;

      case "pvc_invite":
        await handleInvite(client, interaction, vcData, voiceChannel);
        break;

      case "pvc_uninvite":
        await handleUninvite(client, interaction, vcData, voiceChannel);
        break;

      case "pvc_rename":
        await handleRename(client, interaction, vcData, voiceChannel);
        break;

      case "pvc_transfer":
        await handleTransfer(client, interaction, vcData, voiceChannel);
        break;

      case "pvc_lock":
        await handleLock(client, interaction, vcData, voiceChannel);
        break;

      case "pvc_hide":
        await handleHide(client, interaction, vcData, voiceChannel);
        break;

      case "pvc_deletevc":
        await handleDeleteVC(client, interaction, vcData, voiceChannel);
        break;

      case "pvc_status":
        await handleStatus(client, interaction, vcData, voiceChannel);
        break;

      case "pvc_refresh":
        // For global panel, just acknowledge - user should click Status instead
        await interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                "ℹ️ Use the **Status** button to view your current VC information!"
              )
              .setColor("#00BFFF"),
          ],
          flags: Discord.MessageFlags.Ephemeral,
        });
        break;

      case "pvc_delete":
        // This button shouldn't exist in global panel anymore
        await interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                "❌ This button is not available in the global panel!"
              )
              .setColor("#FF0000"),
          ],
          flags: Discord.MessageFlags.Ephemeral,
        });
        break;

      default:
        break;
    }
  } catch (err) {
    console.error("Error handling PVC button:", err);
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ An error occurred!")
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }
  }
};

// ============================================
// BUTTON HANDLERS
// ============================================

async function handleExtend(client, interaction, vcData, voiceChannel) {
  // Show modal for duration input
  const modal = new Discord.ModalBuilder()
    .setCustomId("pvcExtendModal")
    .setTitle("Extend Voice Channel");

  const durationInput = new Discord.TextInputBuilder()
    .setCustomId("extendDuration")
    .setLabel("Duration (e.g., 2hr, 30min)")
    .setStyle(Discord.TextInputStyle.Short)
    .setPlaceholder("Enter duration: 1hr, 30min, etc.")
    .setRequired(true)
    .setMaxLength(10);

  const firstActionRow = new Discord.ActionRowBuilder().addComponents(
    durationInput
  );
  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
}

async function handleAutoToggle(client, interaction, vcData, voiceChannel) {
  const newAutoState = !vcData.IsPAYG;

  try {
    if (newAutoState) {
      // Switching FROM Prepaid TO PAYG mode - clear expiry and enable billing
      vcData.IsPAYG = true;
      vcData.ExpiresAt = null;
      vcData.PaidDuration = 0;
      vcData.ActiveSince = new Date(); // Start billing from now
      await vcData.save();

      await interaction.reply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription(
              `🟢 **Auto-renewal (PAYG) enabled!**\n\n` +
                `Billing starts now at **60 coins/min**.\n` +
                `You'll be warned when balance is low.`
            )
            .setColor("#00FF00"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    } else {
      // Switching FROM PAYG TO Prepaid - calculate final bill and give 2-minute grace period
      const pvcConfig = require("../../database/models/pvcConfig");
      const pvcEconomy = require("../../database/models/pvcEconomy");

      const config = await pvcConfig.findOne({ Guild: interaction.guild.id });
      const paygRate = config?.PAYGPerMinute || 60;

      // Calculate time used
      const activeSince = vcData.ActiveSince || vcData.CreatedAt;
      const now = new Date();
      const elapsed = now - activeSince.getTime();
      const minutesElapsed = Math.floor(elapsed / (1000 * 60));
      const totalCost = minutesElapsed * paygRate;

      // Get user's balance
      const userData = await pvcEconomy.findOne({
        Guild: interaction.guild.id,
        User: interaction.user.id,
      });

      const balance = userData ? userData.Coins : 0;

      if (balance < totalCost) {
        return interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                `❌ **Insufficient balance!**\n\n` +
                  `You used **${minutesElapsed} minutes** = **${totalCost.toLocaleString()} coins**\n` +
                  `Your balance: **${balance.toLocaleString()} coins**\n\n` +
                  `You need **${(
                    totalCost - balance
                  ).toLocaleString()}** more coins to convert to prepaid.`
              )
              .setColor("#FF0000"),
          ],
          flags: Discord.MessageFlags.Ephemeral,
        });
      }

      // Deduct coins
      userData.Coins -= totalCost;
      userData.TotalSpent += totalCost;
      await userData.save();

      vcData.CoinsSpent += totalCost;

      // Convert to prepaid with 2-minute grace period
      vcData.IsPAYG = false;
      vcData.ExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      vcData.PaidDuration = 2;
      vcData.ActiveSince = null; // Stop PAYG billing
      await vcData.save();

      await interaction.reply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription(
              `🔴 **PAYG disabled - Converted to Prepaid!**\n\n` +
                `**Session Summary:**\n` +
                `⏱️ Time used: **${minutesElapsed} minutes**\n` +
                `💰 Total cost: **${totalCost.toLocaleString()} coins** (deducted)\n` +
                `💵 Remaining balance: **${userData.Coins.toLocaleString()} coins**\n\n` +
                `⚠️ **Grace Period: 2 minutes**\n` +
                `Use **!extend** or the **Extend** button to add more time, or your VC will be deleted in **2 minutes**!`
            )
            .setColor("#FFA500")
            .setFooter({ text: "Don't forget to extend!" }),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }
  } catch (err) {
    console.error("Error toggling auto-renewal:", err);
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ Failed to toggle auto-renewal!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }
}

async function handleInvite(client, interaction, vcData, voiceChannel) {
  // Ask user to mention someone in chat
  await interaction.reply({
    embeds: [
      new Discord.EmbedBuilder()
        .setDescription(
          "👥 **Invite a user to your VC**\n\nReply to this message and @mention the user you want to invite.\n\n*You have 30 seconds to reply.*"
        )
        .setColor("#00BFFF"),
    ],
    flags: Discord.MessageFlags.Ephemeral,
  });

  // Create message collector
  const filter = (m) => m.author.id === interaction.user.id;
  const collector = interaction.channel.createMessageCollector({
    filter,
    time: 30000,
    max: 1,
  });

  collector.on("collect", async (message) => {
    // Delete user's message
    await message.delete().catch(() => {});

    // Get mentioned user
    const mentionedUser = message.mentions.users.first();

    if (!mentionedUser) {
      return interaction.followUp({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ No user mentioned! Please @mention a user.")
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    const targetMember = await interaction.guild.members
      .fetch(mentionedUser.id)
      .catch(() => null);

    if (!targetMember) {
      return interaction.followUp({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ User not found in this server!")
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    if (targetMember.user.bot) {
      return interaction.followUp({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ You cannot invite bots!")
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    // Re-fetch VC data
    const voiceChannels = require("../../database/models/voiceChannels");
    const updatedVcData = await voiceChannels.findOne({
      Guild: interaction.guild.id,
      Owner: interaction.user.id,
    });

    if (!updatedVcData) {
      return interaction.followUp({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription(
              "❌ You don't have an active Private Voice Channel!"
            )
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    if (updatedVcData.InvitedUsers.includes(targetMember.id)) {
      return interaction.followUp({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription(`❌ ${targetMember} is already invited!`)
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    const vc = interaction.guild.channels.cache.get(updatedVcData.Channel);
    if (!vc) {
      await voiceChannels.deleteOne({
        Guild: interaction.guild.id,
        Owner: interaction.user.id,
      });
      return interaction.followUp({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ Your VC no longer exists!")
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    // Grant permissions
    await vc.permissionOverwrites.edit(targetMember.id, {
      Connect: true,
      ViewChannel: true,
    });

    // Update database
    updatedVcData.InvitedUsers.push(targetMember.id);
    await updatedVcData.save();

    await interaction.followUp({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(`✅ Invited ${targetMember} to your voice channel!`)
          .setColor("#00FF00"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      interaction
        .followUp({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription("⏰ Time expired! No user was invited.")
              .setColor("#FFA500"),
          ],
          flags: Discord.MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  });
}

async function handleUninvite(client, interaction, vcData, voiceChannel) {
  if (vcData.InvitedUsers.length === 0) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ You haven't invited anyone to your VC!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  // Show list of invited users
  const invitedList = vcData.InvitedUsers.map((id) => `<@${id}>`).join(", ");

  // Ask user to mention someone in chat
  await interaction.reply({
    embeds: [
      new Discord.EmbedBuilder()
        .setDescription(
          `👥 **Uninvite a user from your VC**\n\n**Currently Invited:**\n${invitedList}\n\nReply to this message and @mention the user you want to uninvite.\n\n*You have 30 seconds to reply.*`
        )
        .setColor("#FFA500"),
    ],
    flags: Discord.MessageFlags.Ephemeral,
  });

  // Create message collector
  const filter = (m) => m.author.id === interaction.user.id;
  const collector = interaction.channel.createMessageCollector({
    filter,
    time: 30000,
    max: 1,
  });

  collector.on("collect", async (message) => {
    // Delete user's message
    await message.delete().catch(() => {});

    // Get mentioned user
    const mentionedUser = message.mentions.users.first();

    if (!mentionedUser) {
      return interaction.followUp({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ No user mentioned! Please @mention a user.")
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    // Re-fetch VC data
    const voiceChannels = require("../../database/models/voiceChannels");
    const updatedVcData = await voiceChannels.findOne({
      Guild: interaction.guild.id,
      Owner: interaction.user.id,
    });

    if (!updatedVcData) {
      return interaction.followUp({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription(
              "❌ You don't have an active Private Voice Channel!"
            )
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    if (!updatedVcData.InvitedUsers.includes(mentionedUser.id)) {
      return interaction.followUp({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ This user is not invited to your VC!")
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    const vc = interaction.guild.channels.cache.get(updatedVcData.Channel);
    if (!vc) {
      await voiceChannels.deleteOne({
        Guild: interaction.guild.id,
        Owner: interaction.user.id,
      });
      return interaction.followUp({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ Your VC no longer exists!")
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      });
    }

    const targetMember = await interaction.guild.members
      .fetch(mentionedUser.id)
      .catch(() => null);

    // Remove permissions
    await vc.permissionOverwrites.delete(mentionedUser.id);

    // Update database
    updatedVcData.InvitedUsers = updatedVcData.InvitedUsers.filter(
      (id) => id !== mentionedUser.id
    );
    await updatedVcData.save();

    // Disconnect if in VC
    if (targetMember && targetMember.voice.channelId === vc.id) {
      await targetMember.voice.disconnect("Removed from private VC");
    }

    await interaction.followUp({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(
            `✅ Removed ${
              targetMember || mentionedUser
            } from your voice channel!`
          )
          .setColor("#00FF00"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      interaction
        .followUp({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription("⏰ Time expired! No user was uninvited.")
              .setColor("#FFA500"),
          ],
          flags: Discord.MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  });
}

async function handleRename(client, interaction, vcData, voiceChannel) {
  // Check cooldown (Discord limits: 2 renames per 10 minutes)
  const channelId = voiceChannel.id;
  const cooldownCheck = cooldowns.canRename(channelId);

  if (!cooldownCheck.allowed) {
    const minutesLeft = Math.ceil(cooldownCheck.timeLeft / 60000);
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(
            `⏱️ **Cooldown Active**\n\n` +
              `Discord limits channel renames to **2 per 10 minutes**.\n` +
              `Please wait **${minutesLeft} minute(s)** before renaming again.`
          )
          .setColor("#FFA500"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  // Show modal for new name input
  const modal = new Discord.ModalBuilder()
    .setCustomId("pvcRenameModal")
    .setTitle("Rename Voice Channel");

  const nameInput = new Discord.TextInputBuilder()
    .setCustomId("newName")
    .setLabel("New channel name")
    .setStyle(Discord.TextInputStyle.Short)
    .setPlaceholder("Enter new name (max 100 characters)")
    .setRequired(true)
    .setMaxLength(100);

  const firstActionRow = new Discord.ActionRowBuilder().addComponents(
    nameInput
  );
  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
}

async function handleTransfer(client, interaction, vcData, voiceChannel) {
  const voiceChannels = require("../../database/models/voiceChannels");
  const guildID = interaction.guild.id;
  const userID = interaction.user.id;

  // Reply with ephemeral message asking for mention
  await interaction.reply({
    embeds: [
      new Discord.EmbedBuilder()
        .setDescription(
          "🔄 **Transfer VC Ownership**\n\n" +
            "Please **@mention** the user you want to transfer this VC to in the chat.\n\n" +
            "⏱️ You have 30 seconds to mention the user."
        )
        .setColor("#3498db"),
    ],
    flags: Discord.MessageFlags.Ephemeral,
  });

  // Create message collector
  const filter = (m) => m.author.id === interaction.user.id;
  const collector = interaction.channel.createMessageCollector({
    filter,
    time: 30000,
    max: 1,
  });

  collector.on("collect", async (message) => {
    // Delete the user's message
    await message.delete().catch(() => {});

    // Get mentioned user
    const mentionedUser = message.mentions.users.first();

    if (!mentionedUser) {
      return interaction.editReply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ No user mentioned! Please try again.")
            .setColor("#FF0000"),
        ],
      });
    }

    if (mentionedUser.id === userID) {
      return interaction.editReply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ You cannot transfer to yourself!")
            .setColor("#FF0000"),
        ],
      });
    }

    if (mentionedUser.bot) {
      return interaction.editReply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ You cannot transfer to bots!")
            .setColor("#FF0000"),
        ],
      });
    }

    const targetMember = await interaction.guild.members
      .fetch(mentionedUser.id)
      .catch(() => null);

    if (!targetMember) {
      return interaction.editReply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ User not found in this server!")
            .setColor("#FF0000"),
        ],
      });
    }

    // Check if new owner already has a VC
    const existingVC = await voiceChannels.findOne({
      Guild: guildID,
      Owner: mentionedUser.id,
    });

    if (existingVC) {
      return interaction.editReply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription(
              `❌ ${targetMember} already owns a voice channel!\n` +
                `They must delete their existing VC first.`
            )
            .setColor("#FF0000"),
        ],
      });
    }

    // Show confirmation buttons
    const row = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setCustomId("pvc_transfer_confirm")
        .setLabel("Confirm Transfer")
        .setEmoji("✅")
        .setStyle(Discord.ButtonStyle.Success),

      new Discord.ButtonBuilder()
        .setCustomId("pvc_transfer_cancel")
        .setLabel("Cancel")
        .setEmoji("❌")
        .setStyle(Discord.ButtonStyle.Secondary)
    );

    await interaction.editReply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(
            `⚠️ Transfer ownership to ${targetMember}?\n\n` +
              `**You will lose control of this VC!**\n` +
              `**You will be able to create a new VC after transfer.**`
          )
          .setColor("#FFA500"),
      ],
      components: [row],
    });

    // Wait for confirmation
    const confirmFilter = (i) => i.user.id === userID;
    const confirmCollector =
      interaction.channel.createMessageComponentCollector({
        confirmFilter,
        componentType: Discord.ComponentType.Button,
        time: 15000,
      });

    confirmCollector.on("collect", async (i) => {
      if (i.customId === "pvc_transfer_confirm") {
        try {
          let billingMessage = "";

          // Handle PAYG billing transfer
          if (vcData.IsPAYG) {
            const pvcConfig = require("../../database/models/pvcConfig");
            const pvcEconomy = require("../../database/models/pvcEconomy");

            const config = await pvcConfig.findOne({ Guild: guildID });
            const paygRate = config?.PAYGPerMinute || 60;

            // Calculate old owner's cost
            const activeSince = vcData.ActiveSince || vcData.CreatedAt;
            const now = new Date();
            const elapsed = now - activeSince.getTime();
            const minutesElapsed = Math.floor(elapsed / (1000 * 60));
            const totalCost = minutesElapsed * paygRate;

            // Deduct from old owner
            const oldOwnerData = await pvcEconomy.findOne({
              Guild: guildID,
              User: userID,
            });

            if (oldOwnerData && totalCost > 0) {
              oldOwnerData.Coins = Math.max(0, oldOwnerData.Coins - totalCost);
              oldOwnerData.TotalSpent += totalCost;
              await oldOwnerData.save();

              vcData.CoinsSpent += totalCost;
              billingMessage = `\n💰 Your final bill: **${totalCost.toLocaleString()} coins** (${minutesElapsed} minutes)`;
            }

            // Reset billing for new owner
            vcData.ActiveSince = new Date(); // New owner's billing starts now
            vcData.LastPAYGDeduction = null;
          }

          // Update owner in database
          vcData.Owner = mentionedUser.id;
          await vcData.save();

          // Update permissions
          await voiceChannel.permissionOverwrites.delete(userID);
          await voiceChannel.permissionOverwrites.edit(mentionedUser.id, {
            Connect: true,
            Speak: true,
            ViewChannel: true,
            ManageChannels: true,
          });

          // Kick old owner to prevent billing confusion
          const oldOwnerMember = voiceChannel.members.get(userID);
          if (oldOwnerMember) {
            try {
              await oldOwnerMember.voice.disconnect(
                "Ownership transferred - you can be re-invited by new owner"
              );
            } catch (err) {
              console.log("Could not disconnect old owner:", err.message);
            }
          }

          // Send DM to new owner
          try {
            const pvcConfig = require("../../database/models/pvcConfig");
            const config = await pvcConfig.findOne({ Guild: guildID });

            const dmMessage = vcData.IsPAYG
              ? `🎙️ You are now the owner of **${voiceChannel.name}**!\n\n` +
                `Transferred from: ${interaction.user}\n` +
                `**Mode:** Pay-As-You-Go (**${
                  config?.PAYGPerMinute || 60
                } coins/min**)\n\n` +
                `Billing starts now. Use \`/pvcpanel\` or prefix commands to manage it.`
              : `🎙️ You are now the owner of **${voiceChannel.name}**!\n\n` +
                `Transferred from: ${interaction.user}\n` +
                `Use \`/pvcpanel\` or prefix commands to manage it.`;

            await targetMember.send({
              embeds: [
                new Discord.EmbedBuilder()
                  .setDescription(dmMessage)
                  .setColor("#00FF00"),
              ],
            });
          } catch (err) {
            console.log("Could not DM new owner");
          }

          await i.update({
            embeds: [
              new Discord.EmbedBuilder()
                .setDescription(
                  `✅ Transferred ownership to ${targetMember}!${billingMessage}\n\n` +
                    `You can now create a new voice channel.`
                )
                .setColor("#00FF00"),
            ],
            components: [],
          });

          confirmCollector.stop();
        } catch (err) {
          console.error("Transfer error:", err);
          await i.update({
            embeds: [
              new Discord.EmbedBuilder()
                .setDescription("❌ Failed to transfer ownership!")
                .setColor("#FF0000"),
            ],
            components: [],
          });
        }
      } else if (i.customId === "pvc_transfer_cancel") {
        await i.update({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription("❌ Transfer cancelled")
              .setColor("#FF0000"),
          ],
          components: [],
        });
        confirmCollector.stop();
      }
    });

    confirmCollector.on("end", (collected) => {
      if (collected.size === 0) {
        interaction
          .editReply({
            embeds: [
              new Discord.EmbedBuilder()
                .setDescription(
                  "⏱️ Transfer confirmation timed out. Please try again."
                )
                .setColor("#FF0000"),
            ],
            components: [],
          })
          .catch(() => {});
      }
    });
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      interaction
        .editReply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                "⏱️ Transfer timed out - no user mentioned. Please try again."
              )
              .setColor("#FF0000"),
          ],
        })
        .catch(() => {});
    }
  });
}

async function handleLock(client, interaction, vcData, voiceChannel) {
  const newLockState = !vcData.IsLocked;

  try {
    // Update permissions
    if (newLockState) {
      // Lock: Remove CONNECT permission from @everyone
      await voiceChannel.permissionOverwrites.edit(interaction.guild.id, {
        Connect: false,
      });
    } else {
      // Unlock: Allow CONNECT for @everyone
      await voiceChannel.permissionOverwrites.edit(interaction.guild.id, {
        Connect: null,
      });
    }

    // Update database
    vcData.IsLocked = newLockState;
    await vcData.save();

    await interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(
            `${newLockState ? "🔒" : "🔓"} Voice channel ${
              newLockState ? "locked" : "unlocked"
            } successfully!`
          )
          .setColor("#00FF00"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  } catch (err) {
    console.error("Error locking/unlocking VC:", err);
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ Failed to update lock status!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }
}

async function handleHide(client, interaction, vcData, voiceChannel) {
  const newHideState = !vcData.IsHidden;

  try {
    // Update permissions for @everyone
    if (newHideState) {
      // Hide: Remove VIEW_CHANNEL permission from @everyone
      await voiceChannel.permissionOverwrites.edit(interaction.guild.id, {
        ViewChannel: false,
      });

      // Ensure owner can always see and access their VC
      await voiceChannel.permissionOverwrites.edit(vcData.Owner, {
        ViewChannel: true,
        Connect: true,
      });

      // Ensure all invited users can see and access the VC
      for (const userId of vcData.InvitedUsers) {
        await voiceChannel.permissionOverwrites.edit(userId, {
          ViewChannel: true,
          Connect: true,
        });
      }
    } else {
      // Unhide: Allow VIEW_CHANNEL for @everyone
      await voiceChannel.permissionOverwrites.edit(interaction.guild.id, {
        ViewChannel: null,
      });
    }

    // Update database
    vcData.IsHidden = newHideState;
    await vcData.save();

    await interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(
            `${newHideState ? "👁️‍🗨️" : "👁️"} Voice channel ${
              newHideState ? "hidden" : "visible"
            } successfully!`
          )
          .setColor("#00FF00"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  } catch (err) {
    console.error("Error hiding/unhiding VC:", err);
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ Failed to update visibility!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }
}

async function handleDeleteVC(client, interaction, vcData, voiceChannel) {
  // Show confirmation buttons
  const row = new Discord.ActionRowBuilder().addComponents(
    new Discord.ButtonBuilder()
      .setCustomId("pvc_deletevc_confirm")
      .setLabel("Confirm Delete")
      .setEmoji("✅")
      .setStyle(Discord.ButtonStyle.Danger),

    new Discord.ButtonBuilder()
      .setCustomId("pvc_deletevc_cancel")
      .setLabel("Cancel")
      .setEmoji("❌")
      .setStyle(Discord.ButtonStyle.Secondary)
  );

  await interaction.reply({
    embeds: [
      new Discord.EmbedBuilder()
        .setDescription(
          `⚠️ Are you sure you want to delete your voice channel?\n\n` +
            `**This action cannot be undone!**`
        )
        .setColor("#FFA500"),
    ],
    components: [row],
    flags: Discord.MessageFlags.Ephemeral,
  });

  // Wait for confirmation
  const filter = (i) => i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    componentType: Discord.ComponentType.Button,
    time: 15000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "pvc_deletevc_confirm") {
      try {
        await voiceChannel.delete("VC deleted by owner");
        await voiceChannels.deleteOne({
          Guild: vcData.Guild,
          Owner: vcData.Owner,
        });
        cooldowns.clearCooldown(vcData.Channel);

        await i.update({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription("✅ Voice channel deleted successfully!")
              .setColor("#00FF00"),
          ],
          components: [],
        });
      } catch (err) {
        console.error("Error deleting VC:", err);
        await i.update({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription("❌ Failed to delete voice channel!")
              .setColor("#FF0000"),
          ],
          components: [],
        });
      }
    } else {
      await i.update({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ Deletion cancelled.")
            .setColor("#00FF00"),
        ],
        components: [],
      });
    }
    collector.stop();
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      interaction
        .editReply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription("⏱️ Deletion timed out.")
              .setColor("#FFA500"),
          ],
          components: [],
        })
        .catch(() => {});
    }
  });
}

async function handleStatus(client, interaction, vcData, voiceChannel) {
  const guildID = interaction.guild.id;
  const userID = interaction.user.id;

  // Get user's economy data
  const pvcEconomy = require("../../database/models/pvcEconomy");
  const pvcConfig = require("../../database/models/pvcConfig");
  const economyData = await pvcEconomy.findOne({
    Guild: guildID,
    User: userID,
  });
  const balance = economyData ? economyData.Coins : 0;

  // Get config for PAYG rate
  const config = await pvcConfig.findOne({ Guild: guildID });
  const paygRate = config?.PAYGPerMinute || 60;

  // Calculate time remaining or session info for PAYG
  let timeInfo = "";
  if (vcData.IsPAYG) {
    // Calculate elapsed time and current session cost
    const activeSince = vcData.ActiveSince || vcData.CreatedAt;
    const now = Date.now();
    const elapsed = now - activeSince.getTime();
    const minutesElapsed = Math.floor(elapsed / (1000 * 60));
    const sessionCost = minutesElapsed * paygRate;

    const hours = Math.floor(minutesElapsed / 60);
    const minutes = minutesElapsed % 60;

    timeInfo =
      `⏱️ Session Duration: **${hours}h ${minutes}m**\n` +
      `💸 Rate: **${paygRate} coins/min**\n` +
      `💰 Session Cost: **${sessionCost.toLocaleString()} coins**\n` +
      `⏰ Next Charge: **<t:${Math.floor(
        (vcData.LastPAYGDeduction?.getTime() || activeSince.getTime()) / 1000 +
          60
      )}:R>**`;
  } else {
    // Paid VC - show time remaining
    const now = Date.now();
    const expiresAt = vcData.ExpiresAt.getTime();
    const diff = expiresAt - now;

    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      timeInfo = `⏱️ Time Remaining: **${hours}h ${minutes}m**\n⏰ Expires: **<t:${Math.floor(
        expiresAt / 1000
      )}:R>**`;
    } else {
      timeInfo = `⏱️ Time Remaining: **Expired**`;
    }
  }

  // Get member count
  const memberCount = voiceChannel.members.size;

  const embed = new Discord.EmbedBuilder()
    .setTitle(`📊 Your Voice Channel Status`)
    .setDescription(
      `**Channel:** ${voiceChannel.name}\n` +
        `**Channel Link:** <#${voiceChannel.id}>\n\n` +
        `**Status Information:**\n` +
        `👥 Members: **${memberCount}**\n` +
        `💰 Your Balance: **${balance.toLocaleString()} coins**\n` +
        timeInfo +
        `\n` +
        `🔄 Mode: **${vcData.IsPAYG ? "Pay-As-You-Go" : "Paid"}**\n` +
        `💵 Total Spent: **${vcData.CoinsSpent.toLocaleString()} coins**\n` +
        `📅 Created: <t:${Math.floor(
          vcData.CreatedAt.getTime() / 1000
        )}:R>\n\n` +
        `**Settings:**\n` +
        `🔒 Locked: ${vcData.IsLocked ? "Yes" : "No"}\n` +
        `👁️ Hidden: ${vcData.IsHidden ? "Yes" : "No"}\n` +
        `📝 Invited Users: ${vcData.InvitedUsers.length || "None"}`
    )
    .setColor(vcData.IsPAYG ? "#00BFFF" : "#00FF00")
    .setFooter({
      text: `${interaction.user.username}`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: Discord.MessageFlags.Ephemeral,
  });
}

async function handleRefresh(client, interaction) {
  // Re-run the pvcpanel command
  const pvcpanelCommand = require("../../commands/voice/pvcpanel");
  await interaction.deferUpdate();
  await pvcpanelCommand(client, interaction, []);
}
