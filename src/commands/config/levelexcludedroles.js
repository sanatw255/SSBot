const Discord = require("discord.js");
const levelExcludedRolesSchema = require("../../database/models/levelExcludedRoles");

module.exports = async (client, interaction, args) => {
  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageGuild],
      perms: [Discord.PermissionsBitField.Flags.ManageGuild],
    },
    interaction
  );

  if (perms == false) return;

  const action = interaction.options.getString("action");
  const role = interaction.options.getRole("role");

  console.log(
    `[levelexcludedroles] Command received from: ${interaction.user.username}`
  );
  console.log(
    `[levelexcludedroles] Action: ${action} Role: ${role ? role.name : "none"}`
  );

  try {
    let data = await levelExcludedRolesSchema.findOne({
      Guild: interaction.guild.id,
    });

    if (!data) {
      data = new levelExcludedRolesSchema({
        Guild: interaction.guild.id,
        Roles: [],
      });
    }

    console.log(`[levelexcludedroles] Current excluded roles:`, data.Roles);

    switch (action) {
      case "add": {
        if (!role) {
          return client.errNormal(
            {
              error: "Please provide a role to exclude from XP!",
              type: "editreply",
            },
            interaction
          );
        }

        if (data.Roles.includes(role.id)) {
          return client.errNormal(
            {
              error: `${role.name} is already excluded from gaining XP!`,
              type: "editreply",
            },
            interaction
          );
        }

        data.Roles.push(role.id);
        await data.save();
        console.log(
          `[levelexcludedroles] Added role: ${role.name} (${role.id})`
        );

        client.succNormal(
          {
            text: `Users with ${role.name} will no longer gain XP!`,
            type: "editreply",
          },
          interaction
        );
        break;
      }

      case "remove": {
        if (!role) {
          return client.errNormal(
            {
              error: "Please provide a role to remove from exclusion!",
              type: "editreply",
            },
            interaction
          );
        }

        if (!data.Roles.includes(role.id)) {
          return client.errNormal(
            {
              error: `${role.name} is not in the excluded roles list!`,
              type: "editreply",
            },
            interaction
          );
        }

        data.Roles = data.Roles.filter((r) => r !== role.id);
        await data.save();
        console.log(
          `[levelexcludedroles] Removed role: ${role.name} (${role.id})`
        );

        client.succNormal(
          {
            text: `Users with ${role.name} can now gain XP again!`,
            type: "editreply",
          },
          interaction
        );
        break;
      }

      case "list": {
        if (!data.Roles || data.Roles.length === 0) {
          return client.errNormal(
            {
              error: "No roles are excluded from gaining XP!",
              type: "editreply",
            },
            interaction
          );
        }

        const rolesList = data.Roles.map((roleId) => {
          const guildRole = interaction.guild.roles.cache.get(roleId);
          return guildRole ? `<@&${roleId}>` : `Deleted Role (${roleId})`;
        }).join("\n");

        const embed = new Discord.EmbedBuilder()
          .setTitle("🚫 XP-Excluded Roles")
          .setDescription(
            `Users with these roles won't gain XP:\n\n${rolesList}`
          )
          .setColor(client.config.colors.normal)
          .setTimestamp()
          .setFooter({ text: `Requested by ${interaction.user.username}` });

        interaction.editReply({ embeds: [embed] });
        break;
      }

      case "clear": {
        if (!data.Roles || data.Roles.length === 0) {
          return client.errNormal(
            {
              error: "No roles are currently excluded!",
              type: "editreply",
            },
            interaction
          );
        }

        data.Roles = [];
        await data.save();
        console.log(`[levelexcludedroles] Cleared all excluded roles`);

        client.succNormal(
          {
            text: "All roles can now gain XP!",
            type: "editreply",
          },
          interaction
        );
        break;
      }

      default: {
        client.errNormal(
          {
            error: "Invalid action! Use: add, remove, list, or clear",
            type: "editreply",
          },
          interaction
        );
      }
    }
  } catch (error) {
    console.error("[levelexcludedroles] Error:", error);
    client.errNormal(
      {
        error: "An error occurred while managing excluded roles!",
        type: "editreply",
      },
      interaction
    );
  }
};
