const Discord = require("discord.js");
const generator = require("generate-password");

module.exports = (client, err, command, interaction) => {
  console.log(err);
  const password = generator.generate({ length: 10, numbers: true });

  const errorlog = new Discord.WebhookClient({
    id: client?.webhooks?.errorLogs?.id,
    token: client?.webhooks?.errorLogs?.token,
  });

  const embed = new Discord.EmbedBuilder()
    .setTitle(`🚨・${password}`)
    .addFields(
      {
        name: "✅┇Guild",
        value: `${interaction?.guild?.name || "Unknown"} (${
          interaction?.guild?.id || "Unknown"
        })`,
      },
      { name: "💻┇Command", value: `${command || "Unknown"}` },
      {
        name: "💬┇Error",
        value: `\`\`\`${String(err).substring(0, 1000)}\`\`\``,
      },
      {
        name: "📃┇Stack error",
        value: `\`\`\`${(err?.stack || "No stack trace").substring(
          0,
          1018
        )}\`\`\``,
      }
    )
    .setColor("#FF0000");

  if (client?.webhooks?.errorLogs?.id && client?.webhooks?.errorLogs?.token) {
    errorlog
      .send({ username: "Bot errors", embeds: [embed] })
      .catch((e) => console.log("Webhook error:", e));
  }

  if (!interaction) return;

  const row = new Discord.ActionRowBuilder().addComponents(
    new Discord.ButtonBuilder()
      .setLabel("Support server")
      .setURL(
        client?.config?.discord?.serverInvite || "https://discord.gg/gEnuWZbaBy"
      )
      .setStyle(Discord.ButtonStyle.Link)
  );

  const errorEmbed = new Discord.EmbedBuilder()
    .setTitle("❌・Error")
    .setDescription("There was an error executing this command")
    .setColor("#FF0000")
    .addFields(
      { name: "Error code", value: `\`${password}\``, inline: true },
      {
        name: "What now?",
        value: "You can contact the developers by joining the support server",
        inline: true,
      }
    );

  if (!interaction.replied && !interaction.deferred) {
    interaction
      .reply({ embeds: [errorEmbed], components: [row], ephemeral: true })
      .catch(() => {});
  } else if (interaction.deferred) {
    interaction
      .editReply({ embeds: [errorEmbed], components: [row] })
      .catch(() => {});
  } else {
    interaction
      .followUp({ embeds: [errorEmbed], components: [row], ephemeral: true })
      .catch(() => {});
  }
};
