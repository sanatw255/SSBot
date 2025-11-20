const Discord = require("discord.js");
const voiceChannels = require("../../database/models/voiceChannels");
const pvcEconomy = require("../../database/models/pvcEconomy");
const pvcConfig = require("../../database/models/pvcConfig");
const cooldowns = require("../pvc/cooldowns");

module.exports = async (client, interaction) => {
  // Skip if called during bot initialization
  if (!interaction || !interaction.customId) return;

  const customId = interaction.customId;

  // Only handle PVC modals
  if (!customId.endsWith("Modal")) return;
  if (!customId.startsWith("pvc")) return;

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

    // Handle different modals
    switch (customId) {
      case "pvcExtendModal":
        await handleExtendModal(
          client,
          interaction,
          vcData,
          voiceChannel,
          guildID,
          userID
        );
        break;

      case "pvcInviteModal":
        await handleInviteModal(
          client,
          interaction,
          vcData,
          voiceChannel,
          guildID
        );
        break;

      case "pvcUninviteModal":
        await handleUninviteModal(
          client,
          interaction,
          vcData,
          voiceChannel,
          guildID
        );
        break;

      case "pvcRenameModal":
        await handleRenameModal(client, interaction, vcData, voiceChannel);
        break;

      case "pvcTransferModal":
        await handleTransferModal(
          client,
          interaction,
          vcData,
          voiceChannel,
          guildID,
          userID
        );
        break;

      default:
        break;
    }
  } catch (err) {
    console.error("Error handling PVC modal:", err);
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
// MODAL HANDLERS
// ============================================

async function handleExtendModal(
  client,
  interaction,
  vcData,
  voiceChannel,
  guildID,
  userID
) {
  const durationInput = interaction.fields.getTextInputValue("extendDuration");

  // Parse duration
  let minutes = 0;
  const hrMatch = durationInput.match(/(\d+)\s*h(?:r)?/i);
  const minMatch = durationInput.match(/(\d+)\s*m(?:in)?/i);

  if (hrMatch) minutes += parseInt(hrMatch[1]) * 60;
  if (minMatch) minutes += parseInt(minMatch[1]);

  if (minutes <= 0) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(
            "❌ Invalid duration format! Use: `2hr`, `30min`, `1hr 30min`"
          )
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  // Get config
  const config = await pvcConfig.findOne({ Guild: guildID });
  const hourlyPrice = config?.HourlyPrice || 3600;
  const cost = Math.ceil((minutes / 60) * hourlyPrice);

  // Get user balance
  const economyData = await pvcEconomy.findOne({
    Guild: guildID,
    User: userID,
  });
  const balance = economyData?.Coins || 0;

  if (balance < cost) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(
            `❌ Insufficient balance!\n\n` +
              `**Cost:** ${cost.toLocaleString()} coins\n` +
              `**Your Balance:** ${balance.toLocaleString()} coins\n` +
              `**Needed:** ${(cost - balance).toLocaleString()} coins`
          )
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  // Deduct coins
  economyData.Coins -= cost;
  economyData.TotalSpent += cost;
  await economyData.save();

  // Update VC
  const addedTime = minutes * 60 * 1000; // Convert to milliseconds

  if (vcData.IsPAYG) {
    // Convert PAYG to Paid
    vcData.IsPAYG = false;
    vcData.ExpiresAt = new Date(Date.now() + addedTime);
    vcData.PaidDuration = minutes;
  } else {
    // Extend existing paid duration
    const currentExpiry = vcData.ExpiresAt
      ? vcData.ExpiresAt.getTime()
      : Date.now();
    vcData.ExpiresAt = new Date(currentExpiry + addedTime);
    vcData.PaidDuration += minutes;
  }

  vcData.CoinsSpent += cost;
  await vcData.save();

  await interaction.reply({
    embeds: [
      new Discord.EmbedBuilder()
        .setDescription(
          `✅ Extended your VC by **${minutes} minutes**!\n\n` +
            `**Cost:** ${cost.toLocaleString()} coins\n` +
            `**New Balance:** ${economyData.Coins.toLocaleString()} coins\n` +
            `**Expires:** <t:${Math.floor(
              vcData.ExpiresAt.getTime() / 1000
            )}:R>`
        )
        .setColor("#00FF00"),
    ],
    flags: Discord.MessageFlags.Ephemeral,
  });
}

async function handleInviteModal(
  client,
  interaction,
  vcData,
  voiceChannel,
  guildID
) {
  const userInput = interaction.fields.getTextInputValue("inviteUser");

  // Parse user ID from input (supports @mention or raw ID)
  const userIdMatch = userInput.match(/\d+/);
  if (!userIdMatch) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ Invalid user ID or mention!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  const targetUserId = userIdMatch[0];
  const targetMember = await interaction.guild.members
    .fetch(targetUserId)
    .catch(() => null);

  if (!targetMember) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ User not found in this server!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  if (targetMember.user.bot) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ You cannot invite bots!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  if (vcData.InvitedUsers.includes(targetUserId)) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(`❌ ${targetMember} is already invited!`)
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  // Grant permissions
  await voiceChannel.permissionOverwrites.edit(targetUserId, {
    Connect: true,
    ViewChannel: true,
  });

  // Update database
  vcData.InvitedUsers.push(targetUserId);
  await vcData.save();

  await interaction.reply({
    embeds: [
      new Discord.EmbedBuilder()
        .setDescription(`✅ Invited ${targetMember} to your voice channel!`)
        .setColor("#00FF00"),
    ],
    flags: Discord.MessageFlags.Ephemeral,
  });
}

async function handleUninviteModal(
  client,
  interaction,
  vcData,
  voiceChannel,
  guildID
) {
  const userInput = interaction.fields.getTextInputValue("uninviteUser");

  // Parse user ID from input
  const userIdMatch = userInput.match(/\d+/);
  if (!userIdMatch) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ Invalid user ID or mention!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  const targetUserId = userIdMatch[0];

  if (!vcData.InvitedUsers.includes(targetUserId)) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ This user is not invited to your VC!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  const targetMember = await interaction.guild.members
    .fetch(targetUserId)
    .catch(() => null);

  // Remove permissions
  await voiceChannel.permissionOverwrites.delete(targetUserId);

  // Update database
  vcData.InvitedUsers = vcData.InvitedUsers.filter((id) => id !== targetUserId);
  await vcData.save();

  // Disconnect if in VC
  if (targetMember && targetMember.voice.channelId === voiceChannel.id) {
    await targetMember.voice.disconnect("Removed from private VC");
  }

  await interaction.reply({
    embeds: [
      new Discord.EmbedBuilder()
        .setDescription(
          `✅ Removed ${targetMember || "user"} from your voice channel!`
        )
        .setColor("#00FF00"),
    ],
    flags: Discord.MessageFlags.Ephemeral,
  });
}

async function handleRenameModal(client, interaction, vcData, voiceChannel) {
  const newName = interaction.fields.getTextInputValue("newName").trim();

  if (newName.length === 0 || newName.length > 100) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ Name must be between 1-100 characters!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  const oldName = voiceChannel.name;

  try {
    await voiceChannel.setName(newName);

    // Set cooldown after successful rename
    cooldowns.setRenameCooldown(voiceChannel.id);

    await interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(
            `✅ Renamed your voice channel!\n\n` +
              `**Old Name:** ${oldName}\n` +
              `**New Name:** ${newName}`
          )
          .setColor("#00FF00"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  } catch (err) {
    console.error("Error renaming VC:", err);

    // Check if it's a rate limit error
    if (err.code === 50035 || err.message?.includes("rate limit")) {
      return interaction
        .reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                "❌ **Rate Limit Exceeded!**\n\n" +
                  "Discord limits channel name changes to **2 per 10 minutes**.\n" +
                  "Please wait a few minutes before renaming again."
              )
              .setColor("#FFA500"),
          ],
          flags: Discord.MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }

    return interaction
      .reply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ Failed to rename channel! Try again later.")
            .setColor("#FF0000"),
        ],
        flags: Discord.MessageFlags.Ephemeral,
      })
      .catch(() => {});
  }
}

async function handleTransferModal(
  client,
  interaction,
  vcData,
  voiceChannel,
  guildID,
  userID
) {
  const userInput = interaction.fields.getTextInputValue("transferUser");

  // Parse user ID from input
  const userIdMatch = userInput.match(/\d+/);
  if (!userIdMatch) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ Invalid user ID or mention!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  const targetUserId = userIdMatch[0];

  if (targetUserId === userID) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ You cannot transfer to yourself!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  const targetMember = await interaction.guild.members
    .fetch(targetUserId)
    .catch(() => null);

  if (!targetMember) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ User not found in this server!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  if (targetMember.user.bot) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription("❌ You cannot transfer to bots!")
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  // Check if new owner already has a VC
  const existingVC = await voiceChannels.findOne({
    Guild: guildID,
    Owner: targetUserId,
  });

  if (existingVC) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(
            `❌ ${targetMember} already owns a voice channel!\n` +
              `They must delete their existing VC first.`
          )
          .setColor("#FF0000"),
      ],
      flags: Discord.MessageFlags.Ephemeral,
    });
  }

  // Show confirmation
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

  await interaction.reply({
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
    flags: Discord.MessageFlags.Ephemeral,
  });

  // Wait for confirmation
  const filter = (i) => i.user.id === userID;
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    componentType: Discord.ComponentType.Button,
    time: 15000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "pvc_transfer_confirm") {
      try {
        // Update owner in database
        vcData.Owner = targetUserId;
        await vcData.save();

        // Update permissions
        await voiceChannel.permissionOverwrites.delete(userID);
        await voiceChannel.permissionOverwrites.edit(targetUserId, {
          Connect: true,
          Speak: true,
          ViewChannel: true,
          ManageChannels: true,
        });

        // Send DM to new owner
        try {
          await targetMember.send({
            embeds: [
              new Discord.EmbedBuilder()
                .setDescription(
                  `🎙️ You are now the owner of **${voiceChannel.name}**!\n\n` +
                    `Transferred from: ${interaction.user}\n` +
                    `Use \`/pvcpanel\` or prefix commands to manage it.`
                )
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
                `✅ Transferred ownership to ${targetMember}!\n\n` +
                  `You can now create a new voice channel.`
              )
              .setColor("#00FF00"),
          ],
          components: [],
        });
      } catch (err) {
        console.error("Error transferring VC:", err);
        await i.update({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription("❌ Failed to transfer ownership!")
              .setColor("#FF0000"),
          ],
          components: [],
        });
      }
    } else {
      await i.update({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription("❌ Transfer cancelled.")
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
              .setDescription("⏱️ Transfer timed out.")
              .setColor("#FFA500"),
          ],
          components: [],
        })
        .catch(() => {});
    }
  });
}
