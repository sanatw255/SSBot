const Discord = require("discord.js");
const Schema = require("../../database/models/functions");
const Schema2 = require("../../database/models/channelList");

module.exports = (client) => {
  client
    .on(Discord.Events.MessageCreate, async (message) => {
      if (message.channel.type === Discord.ChannelType.DM || message.author.bot)
        return;

      try {
        const data = await Schema.findOne({ Guild: message.guild.id });
        if (!data) return;

        // 🔗 Anti-Invite System
        if (data.AntiInvite === true) {
          const { content } = message;
          const code = content.split("discord.gg/")[1];

          if (code) {
            const data2 = await Schema2.findOne({ Guild: message.guild.id });
            const exempt =
              data2 &&
              (data2.Channels.includes(message.channel.id) ||
                message.member.permissions.has(
                  Discord.PermissionsBitField.Flags.ManageMessages
                ));

            if (exempt) return;

            await message.delete();
            await client.embed(
              {
                title: `${client.emotes.normal.error}・Moderator`,
                desc: `Discord links are not allowed in this server!`,
                color: client.config.colors.error,
                content: `${message.author}`,
              },
              message.channel
            );
          }
        }

        // 🌐 Anti-Link System
        else if (data.AntiLinks === true) {
          const { content } = message;
          if (
            content.includes("http://") ||
            content.includes("https://") ||
            content.includes("www.")
          ) {
            const data2 = await Schema2.findOne({ Guild: message.guild.id });
            const exempt =
              data2 &&
              (data2.Channels.includes(message.channel.id) ||
                message.member.permissions.has(
                  Discord.PermissionsBitField.Flags.ManageMessages
                ));

            if (exempt) return;

            await message.delete();
            await client.embed(
              {
                title: `${client.emotes.normal.error}・Moderator`,
                desc: `Links are not allowed in this server!`,
                color: client.config.colors.error,
                content: `${message.author}`,
              },
              message.channel
            );
          }
        }
      } catch (err) {
        console.error("[AntiAd] MessageCreate error:", err);
      }
    })
    .setMaxListeners(0);

  // 📝 Handle Message Updates
  client
    .on(Discord.Events.MessageUpdate, async (oldMessage, newMessage) => {
      if (
        oldMessage.content === newMessage.content ||
        newMessage.channel.type === Discord.ChannelType.DM
      )
        return;

      try {
        const data = await Schema.findOne({ Guild: newMessage.guild.id });
        if (!data) return;

        // 🔗 Anti-Invite on Edited Messages
        if (data.AntiInvite === true) {
          const { content } = newMessage;
          const code = content.split("discord.gg/")[1];

          if (code) {
            const data2 = await Schema2.findOne({ Guild: newMessage.guild.id });
            const exempt =
              data2 &&
              (data2.Channels.includes(newMessage.channel.id) ||
                newMessage.member.permissions.has(
                  Discord.PermissionsBitField.Flags.ManageMessages
                ));

            if (exempt) return;

            await newMessage.delete();

            const error = new Discord.EmbedBuilder()
              .setTitle(`${client.emotes.normal.error}・Moderator`)
              .setAuthor({
                name: client.user.username,
                iconURL: client.user.avatarURL(),
              })
              .setDescription(`Discord links are not allowed in this server!`)
              .setColor(client.config.colors.error)
              .setFooter({ text: client.config.discord.footer })
              .setTimestamp();

            const msg = await newMessage.channel.send({
              content: `${newMessage.author}`,
              embeds: [error],
            });
            setTimeout(() => msg.delete().catch(() => {}), 5000);
          }
        }

        // 🌐 Anti-Link on Edited Messages
        else if (data.AntiLinks === true) {
          const { content } = newMessage;

          if (
            content.includes("http://") ||
            content.includes("https://") ||
            content.includes("www.")
          ) {
            const data2 = await Schema2.findOne({ Guild: newMessage.guild.id });
            const exempt =
              data2 &&
              (data2.Channels.includes(newMessage.channel.id) ||
                newMessage.member.permissions.has(
                  Discord.PermissionsBitField.Flags.ManageMessages
                ));

            if (exempt) return;

            await newMessage.delete();

            const error = new Discord.EmbedBuilder()
              .setTitle(`${client.emotes.normal.error}・Moderator`)
              .setAuthor({
                name: client.user.username,
                iconURL: client.user.avatarURL(),
              })
              .setDescription(`Links are not allowed in this server!`)
              .setColor(client.config.colors.error)
              .setFooter({ text: client.config.discord.footer })
              .setTimestamp();

            const msg = await newMessage.channel.send({
              content: `${newMessage.author}`,
              embeds: [error],
            });
            setTimeout(() => msg.delete().catch(() => {}), 5000);
          }
        }
      } catch (err) {
        console.error("[AntiAd] MessageUpdate error:", err);
      }
    })
    .setMaxListeners(0);
};
