const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const aboutme = interaction.options.getString("text");

  if (aboutme.length > 1024)
    return client.errNormal(
      {
        error: "Your about me cannot be longer than 1024 characters",
        type: "editreply",
      },
      interaction
    );

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      data.Aboutme = aboutme;
      await data.save();

      client.succNormal(
        {
          text: "Your about me is set",
          fields: [
            {
              name: "📘┆About Me",
              value: `\`\`\`${aboutme}\`\`\``,
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
    console.error("Error in aboutme profile command:", err);
    client.errNormal(
      {
        error: "An error occurred while setting your about me.",
        type: "editreply",
      },
      interaction
    );
  }
};
