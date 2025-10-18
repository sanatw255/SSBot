const Discord = require("discord.js");
const Schema = require("../../database/models/levelMessages");

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
        title: `ℹ️・Level message options`,
        desc: `These are the level message name options: \n
            \`{user:username}\` - User's username
            \`{user:discriminator}\` - User's discriminator
            \`{user:tag}\` - User's tag
            \`{user:mention}\` - Mention a user

            \`{user:level}\` - User's level
            \`{user:xp}\` - User's xp
            
            **Example message:**
            \`🎉 Congratulations {user:mention}! You've reached level {user:level} with {user:xp} XP!\``,
        type: "editreply",
      },
      interaction
    );
  }

  if (message.toUpperCase() == "DEFAULT") {
    try {
      const data = await Schema.findOne({ Guild: interaction.guild.id });
      if (data) {
        await Schema.findOneAndDelete({ Guild: interaction.guild.id });
        client.succNormal(
          {
            text: `Level message reset to default!`,
            type: "editreply",
          },
          interaction
        );
      } else {
        client.errNormal(
          {
            error: "No custom level message found to delete!",
            type: "editreply",
          },
          interaction
        );
      }
    } catch (error) {
      console.error("Error deleting level message:", error);
    }
  } else {
    try {
      let data = await Schema.findOne({ Guild: interaction.guild.id });

      if (data) {
        data.Message = message;
        await data.save();
      } else {
        data = new Schema({
          Guild: interaction.guild.id,
          Message: message,
        });
        await data.save();
      }

      client.succNormal(
        {
          text: `The level message has been set successfully`,
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
    } catch (error) {
      console.error("Error saving level message:", error);
      client.errNormal(
        {
          error: "Failed to save level message",
          type: "editreply",
        },
        interaction
      );
    }
  }
};
