const Discord = require("discord.js");

const Schema = require("../../database/models/votecredits");

const webhookClientLogs = new Discord.WebhookClient({
  id: "",
  token: "",
});

module.exports = async (client, interaction, args) => {
  const type = interaction.options.getString("type");
  const user = interaction.options.getUser("user");
  const amount = interaction.options.getNumber("amount");

  if (type == "add") {
    try {
      const data = await Schema.findOne({ User: user.id });

      if (data) {
        data.Credits += amount;
        await data.save();
      } else {
        await new Schema({
          User: user.id,
          Credits: amount,
        }).save();
      }

      client.succNormal(
        {
          text: `Added **${amount} credits** to ${user}`,
          type: "editreply",
        },
        interaction
      );

      let embedLogs = new Discord.EmbedBuilder()
        .setTitle(`🪙・Credits added`)
        .setDescription(`Added credits to ${user} (${user.id})`)
        .addFields(
          {
            name: "👤┆Added By",
            value: `${interaction.user} (${interaction.user.tag})`,
            inline: true,
          },
          { name: "🔢┆Amount", value: `${amount}`, inline: true }
        )
        .setColor(client.config.colors.normal)
        .setTimestamp();
      webhookClientLogs.send({
        username: "Bot Credits",
        embeds: [embedLogs],
      });
    } catch (err) {
      console.error("Error in credits command (add):", err);
      client.errNormal(
        { error: "An error occurred while adding credits.", type: "editreply" },
        interaction
      );
    }
  } else if (type == "remove") {
    try {
      const data = await Schema.findOne({ User: user.id });

      if (data) {
        data.Credits -= amount;
        await data.save();
      }

      client.succNormal(
        {
          text: `Removed **${amount} credits** from ${user}`,
          type: "editreply",
        },
        interaction
      );

      let embedLogs = new Discord.EmbedBuilder()
        .setTitle(`🪙・Credits removed`)
        .setDescription(`Removed credits from ${user} (${user.id})`)
        .addFields(
          {
            name: "👤┆Removed By",
            value: `${interaction.user} (${interaction.user.tag})`,
            inline: true,
          },
          { name: "🔢┆Amount", value: `${amount}`, inline: true }
        )
        .setColor(client.config.colors.normal)
        .setTimestamp();
      webhookClientLogs.send({
        username: "Bot Credits",
        embeds: [embedLogs],
      });
    } catch (err) {
      console.error("Error in credits command (remove):", err);
      client.errNormal(
        {
          error: "An error occurred while removing credits.",
          type: "editreply",
        },
        interaction
      );
    }
  }
};
