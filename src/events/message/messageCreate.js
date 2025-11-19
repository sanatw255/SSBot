const Discord = require("discord.js");
const Functions = require("../../database/models/functions");
const afk = require("../../database/models/afk");
const chatBotSchema = require("../../database/models/chatbot-channel");
const messagesSchema = require("../../database/models/messages");
const messageSchema = require("../../database/models/levelMessages");
const messageRewards = require("../../database/models/messageRewards");
const Schema = require("../../database/models/stickymessages");
const levelRewards = require("../../database/models/levelRewards");
const levelLogs = require("../../database/models/levelChannels");
const levelExcludedRolesSchema = require("../../database/models/levelExcludedRoles");
const levelChannelsSchema = require("../../database/models/levelChannels");
const Commands = require("../../database/models/customCommand");
const CommandsSchema = require("../../database/models/customCommandAdvanced");
const fetch = require("node-fetch");

// PVC Commands Handler
const pvcCommandsHandler = require("./pvcCommands");
const pvcConfig = require("../../database/models/pvcConfig");
const pvcEconomy = require("../../database/models/pvcEconomy");

/**
 * @param {Discord.Client} client
 * @param {Discord.Message} message
 */
module.exports = async (client, message) => {
  const dmlog = new Discord.WebhookClient({
    id: client.webhooks.dmLogs.id,
    token: client.webhooks.dmLogs.token,
  });

  if (message.author.bot) return;

  // Auto-delete messages in PVC panel channel (except the panel itself)
  if (message.guild) {
    try {
      const config = await pvcConfig.findOne({ Guild: message.guild.id });
      if (
        config &&
        config.PanelChannel &&
        message.channel.id === config.PanelChannel
      ) {
        await message.delete().catch(() => {});
        return; // Stop processing this message
      }
    } catch (error) {
      console.error("Error in PVC panel auto-delete:", error);
    }
  }

  // Handle PVC prefix commands (!work, !daily, !bal, !give, etc.)
  if (message.guild) {
    await pvcCommandsHandler(client, message);
  }

  // DM Logging
  if (message.channel.type === Discord.ChannelType.DM) {
    const embedLogs = new Discord.EmbedBuilder()
      .setTitle(`💬・New DM message!`)
      .setDescription(`Bot has received a new DM message!`)
      .addFields(
        {
          name: "👤┆Send By",
          value: `${message.author} (${message.author.tag})`,
          inline: true,
        },
        {
          name: `💬┆Message`,
          value: `${message.content || "None"}`,
          inline: true,
        }
      )
      .setColor(client.config.colors.normal)
      .setTimestamp();

    if (message.attachments.size > 0) {
      embedLogs.addFields({
        name: `📃┆Attachments`,
        value: `${message.attachments.first()?.url}`,
        inline: false,
      });
    }

    return dmlog.send({
      username: "Bot DM",
      embeds: [embedLogs],
    });
  }

  // Levels
  try {
    const data = await Functions.findOne({ Guild: message.guild.id });
    if (data && data.Levels === true) {
      // Check if user has excluded role
      const excludedRolesData = await levelExcludedRolesSchema.findOne({
        Guild: message.guild.id,
      });

      let isExcluded = false;
      if (excludedRolesData?.Roles?.length > 0 && message.member) {
        isExcluded = message.member.roles.cache.some((role) =>
          excludedRolesData.Roles.includes(role.id)
        );
      }

      if (isExcluded) {
        // User has an excluded role, skip XP gain
        return;
      }

      const levelChannelData = await levelChannelsSchema.findOne({
        Guild: message.guild.id,
      });
      let isLevelChannel = true;
      if (levelChannelData?.Channels?.length > 0) {
        isLevelChannel = levelChannelData.Channels.includes(message.channel.id);
      }

      if (isLevelChannel) {
        const randomXP = Math.floor(Math.random() * 9) + 1;
        const hasLeveledUp = await client.addXP(
          message.author.id,
          message.guild.id,
          randomXP
        );

        if (hasLeveledUp) {
          const user = await client.fetchLevels(
            message.author.id,
            message.guild.id
          );

          // PVC Level-Up Rewards System
          let coinsEarned = 0;
          const pvcConfigData = await pvcConfig.findOne({
            Guild: message.guild.id,
          });
          if (pvcConfigData && pvcConfigData.LevelRewardsEnabled) {
            // Calculate base reward
            coinsEarned = pvcConfigData.BaseLevelReward || 1000;

            // Add milestone bonuses (check larger milestones first)
            if (user.level % 100 === 0) {
              coinsEarned += pvcConfigData.Milestone100 || 100000;
            } else if (user.level % 50 === 0) {
              coinsEarned += pvcConfigData.Milestone50 || 25000;
            } else if (user.level === 25) {
              coinsEarned += 12500; // Hardcoded Level 25 bonus
            } else if (user.level % 10 === 0) {
              coinsEarned += pvcConfigData.Milestone10 || 5000;
            }

            // Award coins to user
            let userEconomy = await pvcEconomy.findOne({
              Guild: message.guild.id,
              User: message.author.id,
            });

            if (!userEconomy) {
              userEconomy = new pvcEconomy({
                Guild: message.guild.id,
                User: message.author.id,
                Coins: coinsEarned,
              });
            } else {
              userEconomy.Coins += coinsEarned;
            }

            await userEconomy.save();
            console.log(
              `[PVC Rewards] ${message.author.tag} earned ${coinsEarned} coins for reaching level ${user.level}`
            );
          }

          const levelLogData = await levelLogs.findOne({
            Guild: message.guild.id,
          });
          const messageData = await messageSchema.findOne({
            Guild: message.guild.id,
          });

          let levelMessage = messageData
            ? messageData.Message.replace(
                `{user:username}`,
                message.author.username
              )
                .replace(`{user:discriminator}`, message.author.discriminator)
                .replace(`{user:tag}`, message.author.tag)
                .replace(`{user:mention}`, message.author)
                .replace(`{user:level}`, user.level)
                .replace(`{user:xp}`, user.xp)
            : `**GG** <@!${message.author.id}>, you are now level **${user.level}**`;

          // Add PVC coin reward info to level message
          if (coinsEarned > 0) {
            const isMilestone =
              user.level % 100 === 0 ||
              user.level % 50 === 0 ||
              user.level % 10 === 0;
            const coinEmoji = isMilestone ? "🎉🪙" : "🪙";
            levelMessage += `\n${coinEmoji} **+${coinsEarned.toLocaleString()} PVC Coins!**`;
            levelMessage += `\n💰 **New Balance: ${userEconomy.Coins.toLocaleString()} coins**`;
          }

          try {
            if (levelLogData?.Channel) {
              await client.channels.cache
                .get(levelLogData.Channel)
                ?.send({ content: levelMessage });
            } else {
              await message.channel.send({ content: levelMessage });
            }
          } catch {
            await message.channel.send({ content: levelMessage });
          }

          const rewardData = await levelRewards.findOne({
            Guild: message.guild.id,
            Level: user.level,
          });

          if (rewardData) {
            const member = message.guild.members.cache.get(message.author.id);
            if (member) {
              await member.roles.add(rewardData.Role).catch(console.error);
              console.log(
                `Added role ${rewardData.Role} to ${message.author.tag} for reaching level ${user.level}`
              );
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[Levels] Error:", err);
  }

  // Message Tracker System
  try {
    let data = await messagesSchema.findOne({
      Guild: message.guild.id,
      User: message.author.id,
    });

    if (data) {
      data.Messages += 1;
      await data.save();

      const reward = await messageRewards.findOne({
        Guild: message.guild.id,
        Messages: data.Messages,
      });

      if (reward) {
        try {
          await message.guild.members.cache
            .get(message.author.id)
            ?.roles.add(reward.Role);
        } catch {}
      }
    } else {
      await new messagesSchema({
        Guild: message.guild.id,
        User: message.author.id,
        Messages: 1,
      }).save();
    }
  } catch (err) {
    console.error("[Message Tracker] Error:", err);
  }

  // AFK System
  try {
    const afkData = await afk.findOne({
      Guild: message.guild.id,
      User: message.author.id,
    });
    if (afkData) {
      await afk.deleteOne({ Guild: message.guild.id, User: message.author.id });
      const m = await client.simpleEmbed(
        { desc: `${message.author} is no longer afk!` },
        message.channel
      );
      setTimeout(() => m.delete().catch(() => {}), 5000);

      if (message.member.displayName.startsWith(`[AFK] `)) {
        const name = message.member.displayName.replace(`[AFK] `, ``);
        await message.member.setNickname(name).catch(() => {});
      }
    }

    message.mentions.users.forEach(async (u) => {
      if (
        !message.content.includes("@here") &&
        !message.content.includes("@everyone")
      ) {
        const mentionedAfk = await afk.findOne({
          Guild: message.guild.id,
          User: u.id,
        });
        if (mentionedAfk) {
          client.simpleEmbed(
            {
              desc: `${u} is currently afk! **Reason:** ${mentionedAfk.Message}`,
            },
            message.channel
          );
        }
      }
    });
  } catch (err) {
    console.error("[AFK] Error:", err);
  }

  // Chat Bot
  try {
    const data = await chatBotSchema.findOne({ Guild: message.guild.id });
    if (!data || message.channel.id !== data.Channel) return;

    if (process.env.OPENAI) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.OPENAI,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: message.content }],
        }),
      });
      const result = await res.json();
      if (!result.error)
        message.reply({ content: result.choices[0].message.content });
    }
  } catch (err) {
    console.error("[ChatBot] Error:", err);
  }

  // Sticky Messages
  try {
    const data = await Schema.findOne({
      Guild: message.guild.id,
      Channel: message.channel.id,
    });
    if (data) {
      const lastSticky = await message.channel.messages
        .fetch(data.LastMessage)
        .catch(() => {});
      if (lastSticky) await lastSticky.delete().catch(() => {});
      const newMessage = await client.simpleEmbed(
        { desc: `${data.Content}` },
        message.channel
      );
      data.LastMessage = newMessage.id;
      await data.save();
    }
  } catch (err) {
    console.error("[StickyMessages] Error:", err);
  }

  // Prefix + Commands
  let guildSettings = await Functions.findOne({ Guild: message.guild.id });
  if (!guildSettings) {
    await new Functions({
      Guild: message.guild.id,
      Prefix: client.config.discord.prefix,
    }).save();
    guildSettings = await Functions.findOne({ Guild: message.guild.id });
  }

  const prefix = guildSettings?.Prefix || client.config.discord.prefix;
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixRegex = new RegExp(
    `^(<@!?${client.user.id}>|${escapeRegex(prefix)})\\s*`
  );

  if (!prefixRegex.test(message.content.toLowerCase())) return;
  const [, matchedPrefix] = message.content.toLowerCase().match(prefixRegex);

  const args = message.content.slice(matchedPrefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  // Respond to mention
  if (
    message.mentions.users.first()?.id === client.user.id &&
    command.length === 0
  ) {
    const row = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setLabel("Invite")
        .setURL(client.config.discord.botInvite)
        .setStyle(Discord.ButtonStyle.Link),
      new Discord.ButtonBuilder()
        .setLabel("Support server")
        .setURL(client.config.discord.serverInvite)
        .setStyle(Discord.ButtonStyle.Link)
    );

    return client.embed(
      {
        title: "Hi, I'm Bot",
        desc: `Use me via Discord ${client.emotes.normal.slash} commands.`,
        fields: [
          {
            name: "📨┆Invite me",
            value: `[Click here](${client.config.discord.botInvite}) to invite me!`,
          },
          {
            name: "❓┆Support",
            value: `[Join here](${client.config.discord.serverInvite}) if you need help!`,
          },
        ],
        components: [row],
      },
      message.channel
    );
  }

  const cmd = await Commands.findOne({
    Guild: message.guild.id,
    Name: command,
  });
  if (cmd) return message.channel.send({ content: cmd.Responce });

  const cmdx = await CommandsSchema.findOne({
    Guild: message.guild.id,
    Name: command,
  });
  if (cmdx) {
    if (cmdx.Action === "Normal") {
      return message.channel.send({ content: cmdx.Responce });
    } else if (cmdx.Action === "Embed") {
      return client.simpleEmbed({ desc: `${cmdx.Responce}` }, message.channel);
    } else if (cmdx.Action === "DM") {
      return message.author
        .send({ content: cmdx.Responce })
        .catch(() =>
          client.errNormal(
            { error: "I can't DM you, maybe you have DMs turned off!" },
            message.channel
          )
        );
    }
  }
};
