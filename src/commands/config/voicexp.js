const Discord = require("discord.js");
const voiceXPConfig = require("../../database/models/voiceXPConfig");

module.exports = async (client, interaction, args) => {
  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageGuild],
      perms: [Discord.PermissionsBitField.Flags.ManageGuild],
    },
    interaction
  );

  if (perms == false) return;

  const setting = interaction.options.getString("setting");
  const amount = interaction.options.getInteger("amount");
  const enabled = interaction.options.getBoolean("enabled");
  const value = amount ?? enabled;

  console.log(`[voicexp] Command received from: ${interaction.user.username}`);
  console.log(`[voicexp] Setting: ${setting}, Value: ${value}`);

  try {
    let data = await voiceXPConfig.findOne({ Guild: interaction.guild.id });

    if (!data) {
      data = new voiceXPConfig({
        Guild: interaction.guild.id,
        Enabled: false,
        XPAmount: 5,
        Interval: 5,
        AFKDetection: true,
        MinimumUsers: 2,
      });
    }

    switch (setting) {
      case "enabled": {
        if (typeof value !== "boolean") {
          return client.errNormal(
            {
              error: "Please provide true or false!",
              type: "editreply",
            },
            interaction
          );
        }

        data.Enabled = value;
        await data.save();
        console.log(`[voicexp] Set enabled to: ${value}`);

        client.succNormal(
          {
            text: `Voice XP has been ${value ? "enabled" : "disabled"}!`,
            type: "editreply",
          },
          interaction
        );
        break;
      }

      case "xpamount": {
        if (typeof value !== "number" || value < 1 || value > 50) {
          return client.errNormal(
            {
              error: "Please provide a valid XP amount (1-50)!",
              type: "editreply",
            },
            interaction
          );
        }

        data.XPAmount = value;
        await data.save();
        console.log(`[voicexp] Set XP amount to: ${value}`);

        client.succNormal(
          {
            text: `Voice XP amount set to ${value} XP per interval!`,
            type: "editreply",
          },
          interaction
        );
        break;
      }

      case "interval": {
        if (typeof value !== "number" || value < 1 || value > 60) {
          return client.errNormal(
            {
              error: "Please provide a valid interval in minutes (1-60)!",
              type: "editreply",
            },
            interaction
          );
        }

        data.Interval = value;
        await data.save();
        console.log(`[voicexp] Set interval to: ${value} minutes`);

        client.succNormal(
          {
            text: `Voice XP interval set to ${value} minute(s)!`,
            type: "editreply",
          },
          interaction
        );
        break;
      }

      case "afkdetection": {
        if (typeof value !== "boolean") {
          return client.errNormal(
            {
              error: "Please provide true or false!",
              type: "editreply",
            },
            interaction
          );
        }

        data.AFKDetection = value;
        await data.save();
        console.log(`[voicexp] Set AFK detection to: ${value}`);

        client.succNormal(
          {
            text: `AFK detection has been ${value ? "enabled" : "disabled"}!`,
            type: "editreply",
          },
          interaction
        );
        break;
      }

      case "minimumusers": {
        if (typeof value !== "number" || value < 1 || value > 10) {
          return client.errNormal(
            {
              error: "Please provide a valid number of minimum users (1-10)!",
              type: "editreply",
            },
            interaction
          );
        }

        data.MinimumUsers = value;
        await data.save();
        console.log(`[voicexp] Set minimum users to: ${value}`);

        client.succNormal(
          {
            text: `Minimum users for voice XP set to ${value}!`,
            type: "editreply",
          },
          interaction
        );
        break;
      }

      case "view": {
        const embed = new Discord.EmbedBuilder()
          .setTitle("🎙️ Voice XP Configuration")
          .addFields(
            {
              name: "Status",
              value: data.Enabled ? "✅ Enabled" : "❌ Disabled",
              inline: true,
            },
            {
              name: "XP Amount",
              value: `${data.XPAmount} XP`,
              inline: true,
            },
            {
              name: "Interval",
              value: `${data.Interval} minute(s)`,
              inline: true,
            },
            {
              name: "AFK Detection",
              value: data.AFKDetection ? "✅ Enabled" : "❌ Disabled",
              inline: true,
            },
            {
              name: "Minimum Users",
              value: `${data.MinimumUsers} user(s)`,
              inline: true,
            }
          )
          .setColor(client.config.colors.normal)
          .setTimestamp()
          .setFooter({ text: `Requested by ${interaction.user.username}` });

        interaction.editReply({ embeds: [embed] });
        break;
      }

      default: {
        client.errNormal(
          {
            error: "Invalid setting!",
            type: "editreply",
          },
          interaction
        );
      }
    }
  } catch (error) {
    console.error("[voicexp] Error:", error);
    client.errNormal(
      {
        error: "An error occurred while configuring voice XP!",
        type: "editreply",
      },
      interaction
    );
  }
};
