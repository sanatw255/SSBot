const Discord = require("discord.js");
const Schema = require("../../database/models/wordsnake");

module.exports = async (client) => {
  client
    .on(Discord.Events.MessageCreate, async (message) => {
      if (message.author.bot || message.channel.type === Discord.ChannelType.DM)
        return;

      try {
        const data = await Schema.findOne({
          Guild: message.guild.id,
          Channel: message.channel.id,
        });

        if (data) {
          if (!data.lastWord || data.lastWord.trim() === "") {
            await message.react(client.emotes.normal.check);

            data.lastWord = message.content;
            await data.save();
            return;
          }

          const result = data.lastWord.split("");
          const lastChar = result[result.length - 1]?.toLowerCase();

          if (message.content.toLowerCase().startsWith(lastChar)) {
            await message.react(client.emotes.normal.check);

            data.lastWord = message.content.replace(/\s+/g, "");
            await data.save();
          } else {
            await message.react(client.emotes.normal.error);
          }
        }
      } catch (err) {
        console.error("[WordSnake] Error:", err);
      }
    })
    .setMaxListeners(0);
};
