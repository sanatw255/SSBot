const { EmbedBuilder } = require("discord.js");

const invites = require("../../database/models/invites");
const invitedBy = require("../../database/models/inviteBy");
const welcomeSchema = require("../../database/models/welcomeChannels");
const messages = require("../../database/models/inviteMessages");
const rewards = require("../../database/models/inviteRewards");

/**
 * Sends a welcome embed directly to a channel using channel.send().
 * Previously this used client.embed(options, channel) which is broken because
 * client.embed expects an interaction object (with .reply/.editReply), not a channel.
 */
async function sendWelcome(client, channel, desc) {
  if (!channel) return;
  try {
    const embed = new EmbedBuilder()
      .setTitle(`👋・Welcome`)
      .setDescription(desc)
      .setColor(0xED4245) // Red color as requested
      .setFooter({
        text: client.config.discord.footer,
        iconURL: client.user.avatarURL({ size: 1024 }),
      })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Error sending welcome message to channel:", err);
  }
}

/**
 * Replaces all {placeholder} tokens in a message string.
 */
function buildMessage(template, member, inviterObj, inviteCount, leftCount) {
  let msg = template;

  // User tokens
  msg = msg.replace(`{user:username}`, member.user.username);
  msg = msg.replace(`{user:discriminator}`, member.user.discriminator);
  msg = msg.replace(`{user:tag}`, member.user.tag);
  msg = msg.replace(`{user:mention}`, `${member}`);

  // Inviter tokens
  msg = msg.replace(`{inviter:username}`, inviterObj?.username ?? "System");
  msg = msg.replace(`{inviter:discriminator}`, inviterObj?.discriminator ?? "#0000");
  msg = msg.replace(`{inviter:tag}`, inviterObj?.tag ?? "System#0000");
  msg = msg.replace(`{inviter:mention}`, inviterObj ? `<@${inviterObj.id}>` : "System");
  msg = msg.replace(`{inviter:invites}`, inviteCount ?? "∞");
  msg = msg.replace(`{inviter:invites:left}`, leftCount ?? "∞");

  // Guild tokens
  msg = msg.replace(`{guild:name}`, member.guild.name);
  msg = msg.replace(`{guild:members}`, member.guild.memberCount);

  return msg;
}

module.exports = async (client, member, invite, inviter) => {
  const [messageData, channelData] = await Promise.all([
    messages.findOne({ Guild: member.guild.id }),
    welcomeSchema.findOne({ Guild: member.guild.id }),
  ]);

  const welcomeChannel = channelData
    ? member.guild.channels.cache.get(channelData.Channel)
    : null;

  if (!invite || !inviter) {
    // Unknown inviter (joined via vanity, discovery, etc.)
    if (messageData && messageData.inviteJoin) {
      const msg = buildMessage(messageData.inviteJoin, member, null, "∞", "∞");
      await sendWelcome(client, welcomeChannel, msg);
    } else {
      await sendWelcome(
        client,
        welcomeChannel,
        `I cannot trace how **${member} | ${member.user.tag}** joined.`
      );
    }
  } else {
    // Known inviter — update invite count in DB
    let data = await invites.findOne({ Guild: member.guild.id, User: inviter.id });

    if (data) {
      data.Invites += 1;
      data.Total += 1;
      await data.save();
    } else {
      data = await new invites({
        Guild: member.guild.id,
        User: inviter.id,
        Invites: 1,
        Total: 1,
        Left: 0,
      }).save();
    }

    const currentInvites = data.Invites;
    const currentLeft = data.Left;

    if (messageData && messageData.inviteJoin) {
      const msg = buildMessage(
        messageData.inviteJoin,
        member,
        inviter,
        currentInvites,
        currentLeft
      );
      await sendWelcome(client, welcomeChannel, msg);
    } else {
      await sendWelcome(
        client,
        welcomeChannel,
        `**${member} | ${member.user.tag}** was invited by **${inviter.tag}** **(${currentInvites} invites)**`
      );
    }

    // Check invite rewards
    try {
      const rewardData = await rewards.findOne({
        Guild: member.guild.id,
        Invites: currentInvites,
      });
      if (rewardData) {
        const role = member.guild.roles.cache.get(rewardData.Role);
        if (role) member.roles.add(role).catch(() => {});
      }
    } catch (err) {
      console.error("Error checking invite rewards:", err);
    }

    // Track who invited whom
    try {
      const data2 = await invitedBy.findOne({ Guild: member.guild.id });
      if (data2) {
        data2.inviteUser = inviter.id;
        data2.User = member.id;
        await data2.save();
      } else {
        await new invitedBy({
          Guild: member.guild.id,
          inviteUser: inviter.id,
          User: member.id,
        }).save();
      }
    } catch (err) {
      console.error("Error saving invitedBy data:", err);
    }
  }
};
