const Discord = require("discord.js");
const Functions = require("../../database/models/functions");
const voiceXPConfig = require("../../database/models/voiceXPConfig");
const voiceXPChannels = require("../../database/models/voiceXPChannels");
const levelExcludedRolesSchema = require("../../database/models/levelExcludedRoles");

// In-memory tracking of users in voice channels
// Structure: Map<guildId_userId, { intervalId, startTime, channelId }>
const voiceTracking = new Map();

module.exports = async (client, oldState, newState) => {
  const userId = newState.id;
  const guildId = newState.guild.id;
  const trackingKey = `${guildId}_${userId}`;

  // Skip bots
  if (newState.member.user.bot) return;

  try {
    // Check if levels are enabled
    const levelsData = await Functions.findOne({ Guild: guildId });
    if (!levelsData || !levelsData.Levels) return;

    // Check if voice XP is enabled
    const voiceConfig = await voiceXPConfig.findOne({ Guild: guildId });
    if (!voiceConfig || !voiceConfig.Enabled) return;

    // User left voice channel
    if (oldState.channelId && !newState.channelId) {
      console.log(
        `[VoiceXP] ${newState.member.user.username} left voice channel`
      );
      stopTracking(trackingKey);
      return;
    }

    // User joined voice channel
    if (!oldState.channelId && newState.channelId) {
      console.log(
        `[VoiceXP] ${newState.member.user.username} joined voice channel ${newState.channel.name}`
      );
      await startTracking(client, newState, voiceConfig, trackingKey);
      return;
    }

    // User switched channels
    if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      console.log(
        `[VoiceXP] ${newState.member.user.username} switched voice channels`
      );
      stopTracking(trackingKey);
      await startTracking(client, newState, voiceConfig, trackingKey);
      return;
    }

    // User changed state (mute/deafen/etc) in same channel
    if (oldState.channelId === newState.channelId && voiceConfig.AFKDetection) {
      const wasAFK = oldState.selfDeaf || oldState.selfMute;
      const isAFK = newState.selfDeaf || newState.selfMute;

      if (!wasAFK && isAFK) {
        console.log(
          `[VoiceXP] ${newState.member.user.username} went AFK (muted/deafened)`
        );
        stopTracking(trackingKey);
      } else if (wasAFK && !isAFK) {
        console.log(
          `[VoiceXP] ${newState.member.user.username} came back from AFK`
        );
        await startTracking(client, newState, voiceConfig, trackingKey);
      }
    }
  } catch (error) {
    console.error("[VoiceXP] Error in voiceStateUpdate:", error);
  }
};

async function startTracking(client, voiceState, voiceConfig, trackingKey) {
  const userId = voiceState.id;
  const guildId = voiceState.guild.id;
  const channelId = voiceState.channelId;
  const member = voiceState.member;

  // Check if user is excluded
  const excludedData = await levelExcludedRolesSchema.findOne({
    Guild: guildId,
  });
  if (excludedData) {
    // Check if user is directly excluded
    if (excludedData.Users?.includes(userId)) {
      console.log(`[VoiceXP] User ${member.user.username} is excluded from XP`);
      return;
    }

    // Check if user has excluded role
    if (excludedData.Roles?.length > 0) {
      const hasExcludedRole = member.roles.cache.some((role) =>
        excludedData.Roles.includes(role.id)
      );
      if (hasExcludedRole) {
        console.log(`[VoiceXP] User ${member.user.username} has excluded role`);
        return;
      }
    }
  }

  // Check if channel is allowed
  const channelsData = await voiceXPChannels.findOne({ Guild: guildId });
  if (channelsData?.Channels?.length > 0) {
    const channel = voiceState.channel;
    const isAllowed =
      channelsData.Channels.includes(channelId) ||
      (channel.parentId && channelsData.Channels.includes(channel.parentId));

    if (!isAllowed) {
      console.log(`[VoiceXP] Channel ${channel.name} is not configured for XP`);
      return;
    }
  }

  // Check if user is AFK (muted/deafened)
  if (
    voiceConfig.AFKDetection &&
    (voiceState.selfDeaf || voiceState.selfMute)
  ) {
    console.log(`[VoiceXP] User ${member.user.username} is AFK, not tracking`);
    return;
  }

  // Check minimum users in channel
  const channel = voiceState.channel;
  const nonBotMembers = channel.members.filter((m) => !m.user.bot).size;
  if (nonBotMembers < voiceConfig.MinimumUsers) {
    console.log(
      `[VoiceXP] Not enough users in ${channel.name} (${nonBotMembers}/${voiceConfig.MinimumUsers})`
    );
    return;
  }

  // Stop any existing tracking
  stopTracking(trackingKey);

  // Start new interval
  const intervalMs = voiceConfig.Interval * 60 * 1000; // Convert minutes to ms
  const intervalId = setInterval(async () => {
    await grantVoiceXP(client, voiceState, voiceConfig);
  }, intervalMs);

  voiceTracking.set(trackingKey, {
    intervalId,
    startTime: Date.now(),
    channelId,
  });

  console.log(
    `[VoiceXP] Started tracking ${member.user.username} in ${channel.name} (${voiceConfig.XPAmount} XP per ${voiceConfig.Interval} min)`
  );
}

function stopTracking(trackingKey) {
  const tracking = voiceTracking.get(trackingKey);
  if (tracking) {
    clearInterval(tracking.intervalId);
    voiceTracking.delete(trackingKey);
    console.log(`[VoiceXP] Stopped tracking ${trackingKey}`);
  }
}

async function grantVoiceXP(client, voiceState, voiceConfig) {
  const userId = voiceState.id;
  const guildId = voiceState.guild.id;
  const member = voiceState.member;

  try {
    // Double-check user is still in voice and not AFK
    const currentState = voiceState.guild.members.cache.get(userId)?.voice;
    if (!currentState || !currentState.channelId) {
      console.log(
        `[VoiceXP] User ${member.user.username} no longer in voice, stopping`
      );
      stopTracking(`${guildId}_${userId}`);
      return;
    }

    if (
      voiceConfig.AFKDetection &&
      (currentState.selfDeaf || currentState.selfMute)
    ) {
      console.log(`[VoiceXP] User ${member.user.username} is AFK, skipping XP`);
      return;
    }

    // Check minimum users again
    const channel = currentState.channel;
    const nonBotMembers = channel.members.filter((m) => !m.user.bot).size;
    if (nonBotMembers < voiceConfig.MinimumUsers) {
      console.log(`[VoiceXP] Not enough users in ${channel.name}, skipping XP`);
      return;
    }

    // Grant XP
    const xpAmount = voiceConfig.XPAmount;
    const hasLeveledUp = await client.addXP(userId, guildId, xpAmount);

    console.log(
      `[VoiceXP] Granted ${xpAmount} XP to ${member.user.username} in ${channel.name}`
    );

    // Handle level up (same as text messages)
    if (hasLeveledUp) {
      const user = await client.fetchLevels(userId, guildId);
      console.log(
        `[VoiceXP] ${member.user.username} leveled up to ${user.level}!`
      );

      // Check for level rewards and PVC rewards (reuse existing system)
      const levelRewards = require("../../database/models/levelRewards");
      const pvcConfig = require("../../database/models/pvcConfig");
      const pvcEconomy = require("../../database/models/pvcEconomy");

      // Grant role rewards
      const rewards = await levelRewards.find({
        Guild: guildId,
        Level: user.level,
      });

      for (const reward of rewards) {
        const role = voiceState.guild.roles.cache.get(reward.Role);
        if (role && !member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch(() => {});
          console.log(
            `[VoiceXP] Granted role ${role.name} to ${member.user.username}`
          );
        }
      }

      // Grant PVC coins
      const pvcConfigData = await pvcConfig.findOne({ Guild: guildId });
      if (pvcConfigData && pvcConfigData.LevelRewardsEnabled) {
        let coinsEarned = pvcConfigData.BaseLevelReward || 1000;

        if (user.level % 100 === 0) {
          coinsEarned += pvcConfigData.Milestone100 || 100000;
        } else if (user.level % 50 === 0) {
          coinsEarned += pvcConfigData.Milestone50 || 25000;
        } else if (user.level === 25) {
          coinsEarned += 12500;
        } else if (user.level % 10 === 0) {
          coinsEarned += pvcConfigData.Milestone10 || 5000;
        }

        let userEconomy = await pvcEconomy.findOne({
          Guild: guildId,
          User: userId,
        });

        if (!userEconomy) {
          userEconomy = new pvcEconomy({
            Guild: guildId,
            User: userId,
            Coins: coinsEarned,
          });
        } else {
          userEconomy.Coins += coinsEarned;
        }

        await userEconomy.save();
        console.log(
          `[VoiceXP] ${member.user.username} earned ${coinsEarned} coins for level ${user.level}`
        );
      }
    }
  } catch (error) {
    console.error("[VoiceXP] Error granting XP:", error);
  }
}
