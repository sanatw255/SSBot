const Discord = require("discord.js");
const Schema = require("../../database/models/stats");

module.exports = async (client, member) => {
  try {
    // Validate member object
    if (!member || !member.guild) {
      console.error("Invalid member object in updateMembers");
      return;
    }

    const guild = member.guild;

    const data = await Schema.findOne({ Guild: guild.id });
    if (!data || !data.Members) return;

    const channel = guild.channels.cache.get(data.Members);
    if (!channel) return;

    // Get template or use default
    const template = data.MembersChannelName || "𒆜〢Citizens: {count}";
    const newName = template.replace(
      "{count}",
      guild.memberCount.toLocaleString()
    );

    // Only update if name is different to avoid rate limits
    if (channel.name !== newName) {
      await channel.setName(newName);
    }
  } catch (error) {
    console.error("Error updating member stats:", error);
  }
};
