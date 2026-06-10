const { EmbedBuilder } = require("discord.js");

const leaveSchema = require("../../database/models/leaveChannels");
const messages = require("../../database/models/inviteMessages");
const invitedBy = require("../../database/models/inviteBy");
const invites = require("../../database/models/invites");

/**
 * Sends a leave embed directly to a channel using channel.send().
 * Previously this used client.embed(options, channel) which is broken because
 * client.embed expects an interaction object (with .reply/.editReply), not a channel.
 */
async function sendLeave(channel, desc) {
  if (!channel) return;
  try {
    const embed = new EmbedBuilder()
      .setTitle(`👋・Bye`)
      .setDescription(desc)
      .setColor(0xed4245)
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Error sending leave message to channel:", err);
  }
}

module.exports = async (client, member) => {
  // Update member stats
  require("../stats/updateMembers")(client, member);

  const messageData = await messages.findOne({ Guild: member.guild.id });
  const inviteByData = await invitedBy.findOne({
    Guild: member.guild.id,
    User: member.id,
  });
  const channelData = await leaveSchema.findOne({ Guild: member.guild.id });

  const leaveChannel = channelData
    ? member.guild.channels.cache.get(channelData.Channel)
    : null;

  if (inviteByData) {
    const inviteData = await invites.findOne({
      Guild: member.guild.id,
      User: inviteByData.inviteUser,
    });

    if (inviteData) {
      inviteData.Invites -= 1;
      inviteData.Left += 1;
      await inviteData.save();
    }

    if (leaveChannel) {
      if (messageData && messageData.inviteLeave) {
        var leaveMessage = messageData.inviteLeave;
        leaveMessage = leaveMessage.replace(`{user:username}`, member.user.username);
        leaveMessage = leaveMessage.replace(`{user:discriminator}`, member.user.discriminator);
        leaveMessage = leaveMessage.replace(`{user:tag}`, member.user.tag);
        leaveMessage = leaveMessage.replace(`{user:mention}`, `${member}`);
        leaveMessage = leaveMessage.replace(`{inviter:mention}`, `<@!${inviteByData.inviteUser}>`);
        leaveMessage = leaveMessage.replace(`{inviter:invites}`, inviteData?.Invites ?? "?");
        leaveMessage = leaveMessage.replace(`{inviter:invites:left}`, inviteData?.Left ?? "?");
        leaveMessage = leaveMessage.replace(`{guild:name}`, member.guild.name);
        leaveMessage = leaveMessage.replace(`{guild:members}`, member.guild.memberCount);

        try {
          const user = await client.users.fetch(inviteByData.inviteUser);
          leaveMessage = leaveMessage.replace(`{inviter:username}`, user.username);
          leaveMessage = leaveMessage.replace(`{inviter:discriminator}`, user.discriminator);
          leaveMessage = leaveMessage.replace(`{inviter:tag}`, `${user.username}#${user.discriminator}`);
          await sendLeave(leaveChannel, leaveMessage);
        } catch {
          await sendLeave(leaveChannel, leaveMessage);
        }
      } else {
        try {
          const user = await client.users.fetch(inviteByData.inviteUser).catch(() => null);
          if (user) {
            await sendLeave(leaveChannel, `**${member.user.tag}** was invited by **${user.tag}**`);
          } else {
            await sendLeave(leaveChannel, `**${member.user.tag}** was invited by an unknown user`);
          }
        } catch {
          await sendLeave(leaveChannel, `**${member.user.tag}** has left us`);
        }
      }
    }
  } else {
    await sendLeave(leaveChannel, `**${member.user.tag}** has left us`);
  }
};
