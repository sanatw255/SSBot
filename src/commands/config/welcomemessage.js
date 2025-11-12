const Discord = require("discord.js");

const inviteMessages = require("../../database/models/inviteMessages");

module.exports = async (client, interaction, args) => {
  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageMessages],
      perms: [Discord.PermissionsBitField.Flags.ManageMessages],
    },
    interaction
  );

  if (perms == false) return;

  const message = interaction.options.getString("message");

  if (message.toUpperCase() == "HELP") {
    return client.embed(
      {
        title: `ℹ️・Welcome message options`,
        desc: `Join message options: \n
            \`{user:username}\` - User's username
            \`{user:discriminator}\` - User's discriminator
            \`{user:tag}\` - User's tag
            \`{user:mention}\` - Mention a user

            \`{inviter:username}\` - inviter's username
            \`{inviter:discriminator}\` - inviter's discriminator
            \`{inviter:tag}\` - inviter's tag
            \`{inviter:mention}\` - inviter's mention
            \`{inviter:invites}\` - inviter's invites
            \`{inviter:invites:left}\` - inviter's left invites
                    
            \`{guild:name}\` - Server name
            \`{guild:members}\` - Server members count`,
        type: "editreply",
      },
      interaction
    );
  }

  if (message.toUpperCase() == "DEFAULT") {
    try {
      const data = await inviteMessages.findOne({
        Guild: interaction.guild.id,
      });
      if (data) {
        data.inviteJoin = null;
        await data.save();

        client.succNormal(
          {
            text: `Welcome message deleted!`,
            type: "editreply",
          },
          interaction
        );
      }
    } catch (err) {
      console.error("Error deleting welcome message:", err);
      client.errNormal(
        {
          error: "An error occurred while deleting the welcome message.",
          type: "editreply",
        },
        interaction
      );
    }
  } else {
    try {
      const data = await inviteMessages.findOne({
        Guild: interaction.guild.id,
      });
      if (data) {
        // Replace \n with actual line breaks
        const processedMessage = message.replace(/\\n/g, "\n");
        data.inviteJoin = processedMessage;
        await data.save();
      } else {
        // Replace \n with actual line breaks
        const processedMessage = message.replace(/\\n/g, "\n");
        await new inviteMessages({
          Guild: interaction.guild.id,
          inviteJoin: processedMessage,
        }).save();
      }

      client.succNormal(
        {
          text: `The welcome message has been set successfully`,
          fields: [
            {
              name: `💬┆Message`,
              value: `${message}`,
              inline: true,
            },
          ],
          type: "editreply",
        },
        interaction
      );
    } catch (err) {
      console.error("Error setting welcome message:", err);
      client.errNormal(
        {
          error: "An error occurred while setting the welcome message.",
          type: "editreply",
        },
        interaction
      );
    }
  }
};
