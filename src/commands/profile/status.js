const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const status = interaction.options.getString("text");

  if (status.length > 30)
    return client.errNormal(
      {
        error: "Your status cannot be longer than 30 characters",
        type: "editreply",
      },
      interaction
    );

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      data.Status = status;
      await data.save();

      client.succNormal(
        {
          text: "Your status is set",
          fields: [
            {
              name: "😎┆Status",
              value: `\`\`\`${status}\`\`\``,
              inline: true,
            },
          ],
          type: "editreply",
        },
        interaction
      );
    } else {
      return client.errNormal(
        {
          error: "No profile found! Open a profile with createprofile",
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in status profile command:", err);
    client.errNormal(
      {
        error: "An error occurred while setting your status.",
        type: "editreply",
      },
      interaction
    );
  }
};
