const Discord = require("discord.js")
const LogChannels = require("../../database/models/logChannels")

/**
 *
 * @param {Discord.Client} client
 * @param {Discord.GuildMember} oldMember
 * @param {Discord.GuildMember} newMember
 * @returns
 */
module.exports = async (client, oldMember, newMember) => {
  if (!oldMember || !newMember) return
  const removedRoles = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id))
  const addedRoles = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id))
  if ((removedRoles.size === 0 && addedRoles.size === 0) || removedRoles.size === addedRoles.size) return

  // Fix: Replace client.getLogs with proper database query
  try {
    const logData = await LogChannels.findOne({ Guild: newMember.guild.id })
    if (!logData || !logData.Channel) return

    const logsChannel = newMember.guild.channels.cache.get(logData.Channel)
    if (!logsChannel) return

    var ostring = ""
    if (removedRoles.size === 0) ostring = "No roles removed"
    if (removedRoles.size > 0)
      removedRoles.forEach((element) => {
        ostring += "<@&" + element + "> "
      })

    var nstring = ""
    if (addedRoles.size > 0)
      addedRoles.forEach((element) => {
        nstring += "<@&" + element + "> "
      })

    // Create embed manually since client.embed might not exist
    const embed = new Discord.EmbedBuilder()
      .setTitle(`${newMember.user.username} roles adjusted`)
      .setDescription(`There are roles changed`)
      .addFields([
        {
          name: `> Old Roles`,
          value: `- ${ostring}`,
        },
        {
          name: `> New Roles`,
          value: `- ${nstring}`,
        },
      ])
      .setColor("#0099ff")
      .setTimestamp()

    await logsChannel.send({ embeds: [embed] })
  } catch (error) {
    console.error("Error in guildMemberUpdate:", error)
  }
}
