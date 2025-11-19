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
  const type = interaction.options.getString("type");
  const role = interaction.options.getRole("role");
  const user = interaction.options.getUser("user");

  console.log(
    `[levelexcludedroles] Command received from: ${interaction.user.username}`
  );
  console.log(
    `[levelexcludedroles] Action: ${action} Type: ${type || "none"} Role: ${
      role ? role.name : "none"
    } User: ${user ? user.username : "none"}`
  );

  try {
    let data = await levelExcludedRolesSchema.findOne({
      Guild: interaction.guild.id,
    });

    if (!data) {
      data = new levelExcludedRolesSchema({
        Guild: interaction.guild.id,
        Roles: [],
        Users: [],
      });
    }

    console.log(`[levelexcludedroles] Current excluded roles:`, data.Roles);
    console.log(`[levelexcludedroles] Current excluded users:`, data.Users);

    switch (action) {
      case "add": {
        if (!type) {
          return client.errNormal(
            {
              error: "Please select a type (role or user)!",
              type: "editreply",
            },
            interaction
          );
        }

        if (type === "role") {
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
        } else if (type === "user") {
          if (!user) {
            return client.errNormal(
              {
                error: "Please provide a user to exclude from XP!",
                type: "editreply",
              },
              interaction
            );
          }

          if (data.Users.includes(user.id)) {
            return client.errNormal(
              {
                error: `${user.username} is already excluded from gaining XP!`,
                type: "editreply",
              },
              interaction
            );
          }

          data.Users.push(user.id);
          await data.save();
          console.log(
            `[levelexcludedroles] Added user: ${user.username} (${user.id})`
          );

          client.succNormal(
            {
              text: `${user.username} will no longer gain XP!`,
              type: "editreply",
            },
            interaction
          );
        }
        break;
      }

      case "remove": {
        if (!type) {
          return client.errNormal(
            {
              error: "Please select a type (role or user)!",
              type: "editreply",
            },
            interaction
          );
        }

        if (type === "role") {
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
        } else if (type === "user") {
          if (!user) {
            return client.errNormal(
              {
                error: "Please provide a user to remove from exclusion!",
                type: "editreply",
              },
              interaction
            );
          }

          if (!data.Users.includes(user.id)) {
            return client.errNormal(
              {
                error: `${user.username} is not in the excluded users list!`,
                type: "editreply",
              },
              interaction
            );
          }

          data.Users = data.Users.filter((u) => u !== user.id);
          await data.save();
          console.log(
            `[levelexcludedroles] Removed user: ${user.username} (${user.id})`
          );

          client.succNormal(
            {
              text: `${user.username} can now gain XP again!`,
              type: "editreply",
            },
            interaction
          );
        }
        break;
      }

      case "list": {
        const hasRoles = data.Roles && data.Roles.length > 0;
        const hasUsers = data.Users && data.Users.length > 0;

        if (!hasRoles && !hasUsers) {
          return client.errNormal(
            {
              error: "No roles or users are excluded from gaining XP!",
              type: "editreply",
            },
            interaction
          );
        }

        let description = "";

        if (hasRoles) {
          const rolesList = data.Roles.map((roleId) => {
            const guildRole = interaction.guild.roles.cache.get(roleId);
            return guildRole ? `<@&${roleId}>` : `Deleted Role (${roleId})`;
          }).join("\n");
          description += `**Excluded Roles:**\n${rolesList}\n\n`;
        }

        if (hasUsers) {
          const usersList = data.Users.map((userId) => {
            return `<@${userId}>`;
          }).join("\n");
          description += `**Excluded Users:**\n${usersList}`;
        }

        const embed = new Discord.EmbedBuilder()
          .setTitle("🚫 XP Exclusions")
          .setDescription(description)
          .setColor(client.config.colors.normal)
          .setTimestamp()
          .setFooter({ text: `Requested by ${interaction.user.username}` });

        interaction.editReply({ embeds: [embed] });
        break;
      }

      case "clear": {
        const hasRoles = data.Roles && data.Roles.length > 0;
        const hasUsers = data.Users && data.Users.length > 0;

        if (!hasRoles && !hasUsers) {
          return client.errNormal(
            {
              error: "No roles or users are currently excluded!",
              type: "editreply",
            },
            interaction
          );
        }

        data.Roles = [];
        data.Users = [];
        await data.save();
        console.log(`[levelexcludedroles] Cleared all exclusions`);

        client.succNormal(
          {
            text: "All roles and users can now gain XP!",
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
