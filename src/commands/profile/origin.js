const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const country = interaction.options.getString("country");

  if (country.length > 50)
    return client.errNormal(
      {
        error: "Your origin cannot be longer than 50 characters",
        type: "editreply",
      },
      interaction
    );

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      data.Orgin = country;
      await data.save();

      client.succNormal(
        {
          text: "Your origin is set",
          fields: [
            {
              name: "🌍┆Country",
              value: `\`\`\`${country}\`\`\``,
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
    console.error("Error in origin profile command:", err);
    client.errNormal(
      {
        error: "An error occurred while setting your origin.",
        type: "editreply",
      },
      interaction
    );
  }
};
