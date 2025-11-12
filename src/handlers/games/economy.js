const Discord = require("discord.js");

const Schema = require("../../database/models/economy");
const itemSchema = require("../../database/models/economyItems");

module.exports = async (client) => {
  client.addMoney = async function (interaction, user, amount) {
    try {
      const data = await Schema.findOne({
        Guild: interaction.guild.id,
        User: user.id,
      });

      if (data) {
        data.Money += amount;
        await data.save();
      } else {
        await new Schema({
          Guild: interaction.guild.id,
          User: user.id,
          Money: amount,
          Bank: 0,
        }).save();
      }
    } catch (err) {
      console.error("Error in addMoney:", err);
    }
  };

  client.removeMoney = async function (interaction, user, amount) {
    try {
      const data = await Schema.findOne({
        Guild: interaction.guild.id,
        User: user.id,
      });

      if (data) {
        data.Money -= amount;
        await data.save();
      } else {
        client.errNormal(
          `User has no ${client.emotes.economy.coins}!`,
          interaction.channel
        );
      }
    } catch (err) {
      console.error("Error in removeMoney:", err);
    }
  };

  client.buyItem = async function (interaction, user, item) {
    try {
      const data = await itemSchema.findOne({
        Guild: interaction.guild.id,
        User: user.id,
      });

      if (item == "FishingRod") {
        if (data) {
          data.FishingRod = true;
          await data.save();
        } else {
          await new itemSchema({
            Guild: interaction.guild.id,
            User: user.id,
            FishingRod: true,
          }).save();
        }
      }
    } catch (err) {
      console.error("Error in buyItem:", err);
    }
  };
};
