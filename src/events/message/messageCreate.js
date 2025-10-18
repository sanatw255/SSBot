const Discord = require("discord.js")

const Functions = require("../../database/models/functions")
const afk = require("../../database/models/afk")
const chatBotSchema = require("../../database/models/chatbot-channel")
const messagesSchema = require("../../database/models/messages")
const messageSchema = require("../../database/models/levelMessages")
const messageRewards = require("../../database/models/messageRewards")
const Schema = require("../../database/models/stickymessages")
const levelRewards = require("../../database/models/levelRewards")
const levelLogs = require("../../database/models/levelChannels")
const levelChannelsSchema = require("../../database/models/levelChannels")
const Commands = require("../../database/models/customCommand")
const CommandsSchema = require("../../database/models/customCommandAdvanced")
const fetch = require("node-fetch")

/**
 *
 * @param {Discord.Client} client
 * @param {Discord.Message} message
 * @returns
 */
module.exports = async (client, message) => {
  const dmlog = new Discord.WebhookClient({
    id: client.webhooks.dmLogs.id,
    token: client.webhooks.dmLogs.token,
  })

  if (message.author.bot) return

  if (message.channel.type === Discord.ChannelType.DM) {
    const embedLogs = new Discord.EmbedBuilder()
      .setTitle(`💬・New DM message!`)
      .setDescription(`Bot has received a new DM message!`)
      .addFields(
        { name: "👤┆Send By", value: `${message.author} (${message.author.tag})`, inline: true },
        { name: `💬┆Message`, value: `${message.content || "None"}`, inline: true },
      )
      .setColor(client.config.colors.normal)
      .setTimestamp()

    if (message.attachments.size > 0)
      embedLogs.addFields({ name: `📃┆Attachments`, value: `${message.attachments.first()?.url}`, inline: false })
    return dmlog.send({
      username: "Bot DM",
      embeds: [embedLogs],
    })
  }

  // Levels - NOW ONLY WORKS IN ALLOWED CHANNELS
  Functions.findOne({ Guild: message.guild.id }, async (err, data) => {
    if (data) {
      if (data.Levels == true) {
        // Check if this channel is allowed for leveling
        const levelChannelData = await levelChannelsSchema.findOne({
          Guild: message.guild.id,
        })

        // If no level channels are set, allow all channels (backward compatibility)
        // If level channels are set, only allow those specific channels
        let isLevelChannel = true
        if (levelChannelData && levelChannelData.Channels && levelChannelData.Channels.length > 0) {
          isLevelChannel = levelChannelData.Channels.includes(message.channel.id)
        }

        if (isLevelChannel) {
          const randomXP = Math.floor(Math.random() * 9) + 1
          const hasLeveledUp = await client.addXP(message.author.id, message.guild.id, randomXP)

          if (hasLeveledUp) {
            const user = await client.fetchLevels(message.author.id, message.guild.id)

            const levelLogData = await levelLogs.findOne({
              Guild: message.guild.id,
            })
            const messageData = await messageSchema.findOne({
              Guild: message.guild.id,
            })

            let levelMessage
            if (messageData) {
              levelMessage = messageData.Message
              levelMessage = levelMessage.replace(`{user:username}`, message.author.username)
              levelMessage = levelMessage.replace(`{user:discriminator}`, message.author.discriminator)
              levelMessage = levelMessage.replace(`{user:tag}`, message.author.tag)
              levelMessage = levelMessage.replace(`{user:mention}`, message.author)

              levelMessage = levelMessage.replace(`{user:level}`, user.level)
              levelMessage = levelMessage.replace(`{user:xp}`, user.xp)
            } else {
              levelMessage = `**GG** <@!${message.author.id}>, you are now level **${user.level}**`
            }

            try {
              if (levelLogData && levelLogData.Channel) {
                await client.channels.cache
                  .get(levelLogData.Channel)
                  .send({ content: levelMessage })
                  .catch(() => {})
              } else {
                await message.channel.send({ content: levelMessage })
              }
            } catch {
              await message.channel.send({ content: levelMessage })
            }

            try {
              const rewardData = await levelRewards.findOne({
                Guild: message.guild.id,
                Level: user.level,
              })

              if (rewardData) {
                const member = message.guild.members.cache.get(message.author.id)
                if (member) {
                  await member.roles.add(rewardData.Role).catch(console.error)
                  console.log(`Added role ${rewardData.Role} to ${message.author.tag} for reaching level ${user.level}`)
                }
              }
            } catch (error) {
              console.error("Error assigning level reward:", error)
            }
          }
        }
      }
    }
  })

  // Message tracker system
  messagesSchema.findOne({ Guild: message.guild.id, User: message.author.id }, async (err, data) => {
    if (data) {
      data.Messages += 1
      data.save()

      messageRewards.findOne({ Guild: message.guild.id, Messages: data.Messages }, async (err, data) => {
        if (data) {
          try {
            message.guild.members.cache.get(message.author.id).roles.add(data.Role)
          } catch {}
        }
      })
    } else {
      new messagesSchema({
        Guild: message.guild.id,
        User: message.author.id,
        Messages: 1,
      }).save()
    }
  })

  // AFK system
  afk.findOne({ Guild: message.guild.id, User: message.author.id }, async (err, data) => {
    if (data) {
      await afk.deleteOne({
        Guild: message.guild.id,
        User: message.author.id,
      })

      client
        .simpleEmbed(
          {
            desc: `${message.author} is no longer afk!`,
          },
          message.channel,
        )
        .then(async (m) => {
          setTimeout(() => {
            m.delete()
          }, 5000)
        })

      if (message.member.displayName.startsWith(`[AFK] `)) {
        const name = message.member.displayName.replace(`[AFK] `, ``)
        message.member.setNickname(name).catch((e) => {})
      }
    }
  })

  message.mentions.users.forEach(async (u) => {
    if (!message.content.includes("@here") && !message.content.includes("@everyone")) {
      afk.findOne({ Guild: message.guild.id, User: u.id }, async (err, data) => {
        if (data) {
          client.simpleEmbed({ desc: `${u} is currently afk! **Reason:** ${data.Message}` }, message.channel)
        }
      })
    }
  })

  // Chat bot
  chatBotSchema.findOne({ Guild: message.guild.id }, async (err, data) => {
    if (!data) return
    if (message.channel.id !== data.Channel) return
    if (process.env.OPENAI) {
      fetch(`https://api.openai.com/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.OPENAI,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: message.content,
            },
          ],
        }),
      })
        .catch(() => {})
        .then((res) => {
          res.json().then((data) => {
            if (data.error) return
            message.reply({ content: data.choices[0].message.content })
          })
        })
    } else {
      try {
        const input = message
        fetch(`https://api.coreware.nl/fun/chat?msg=${encodeURIComponent(input)}&uid=${message.author.id}`)
          .catch(() => {
            console.log
          })
          .then((res) => res.json())
          .catch(() => {
            console.log
          })
          .then(async (json) => {
            console.log(json)
            if (json) {
              if (
                json.response !== " " ||
                json.response !== undefined ||
                json.response !== "" ||
                json.response !== null
              ) {
                try {
                  return message.reply({ content: json.response }).catch(() => {})
                } catch {}
              }
            }
          })
          .catch(() => {})
      } catch {}
    }
  })

  // Sticky messages
  try {
    Schema.findOne({ Guild: message.guild.id, Channel: message.channel.id }, async (err, data) => {
      if (!data) return

      const lastStickyMessage = await message.channel.messages.fetch(data.LastMessage).catch(() => {})
      if (!lastStickyMessage) return
      await lastStickyMessage.delete({ timeout: 1000 })

      const newMessage = await client.simpleEmbed({ desc: `${data.Content}` }, message.channel)

      data.LastMessage = newMessage.id
      data.save()
    })
  } catch {}

  // Prefix
  var guildSettings = await Functions.findOne({ Guild: message.guild.id })
  if (!guildSettings) {
    new Functions({
      Guild: message.guild.id,
      Prefix: client.config.discord.prefix,
    }).save()

    guildSettings = await Functions.findOne({ Guild: message.guild.id })
  }

  let prefix
  if (!guildSettings || !guildSettings.Prefix) {
    prefix = client.config.discord.prefix
  } else {
    prefix = guildSettings.Prefix
  }

  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(prefix)})\\s*`)

  if (!prefixRegex.test(message.content.toLowerCase())) return
  const [, matchedPrefix] = message.content.toLowerCase().match(prefixRegex)

  const args = message.content.slice(matchedPrefix.length).trim().split(/ +/g)
  const command = args.shift().toLowerCase()

  if (message.mentions.users.first() && message.mentions.users.first().id == client.user.id && command.length === 0) {
    const row = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setLabel("Invite")
        .setURL(client.config.discord.botInvite)
        .setStyle(Discord.ButtonStyle.Link),

      new Discord.ButtonBuilder()
        .setLabel("Support server")
        .setURL(client.config.discord.serverInvite)
        .setStyle(Discord.ButtonStyle.Link),
    )

    client
      .embed(
        {
          title: "Hi, i'm Bot",
          desc: `Use with commands via Discord ${client.emotes.normal.slash} commands`,
          fields: [
            {
              name: "📨┆Invite me",
              value: `Invite Bot in your own server! [Click here](${client.config.discord.botInvite})`,
            },
            {
              name: "❓┇I don't see any slash commands",
              value:
                "The bot may not have permissions for this. Open the invite link again and select your server. The bot then gets the correct permissions",
            },
            {
              name: "❓┆Need support?",
              value: `For questions you can join our [support server](${client.config.discord.serverInvite})!`,
            },
            {
              name: "🐞┆Found a bug?",
              value: `Report all bugs via: \`/report bug\`!`,
            },
          ],
          components: [row],
        },
        message.channel,
      )
      .catch(() => {})
  }

  const cmd = await Commands.findOne({
    Guild: message.guild.id,
    Name: command,
  })
  if (cmd) {
    return message.channel.send({ content: cmd.Responce })
  }

  const cmdx = await CommandsSchema.findOne({
    Guild: message.guild.id,
    Name: command,
  })
  if (cmdx) {
    if (cmdx.Action == "Normal") {
      return message.channel.send({ content: cmdx.Responce })
    } else if (cmdx.Action == "Embed") {
      return client.simpleEmbed(
        {
          desc: `${cmdx.Responce}`,
        },
        message.channel,
      )
    } else if (cmdx.Action == "DM") {
      return message.author.send({ content: cmdx.Responce }).catch((e) => {
        client.errNormal(
          {
            error: "I can't DM you, maybe you have DM turned off!",
          },
          message.channel,
        )
      })
    }
  }
}
