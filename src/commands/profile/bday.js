const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const joined = interaction.options.getString("bday");
  const split = joined.trim().split("/");

  let [day, month] = split;

  if (!day || !month)
    return client.errUsage(
      { usage: "setbday [day]/[month]", type: "editreply" },
      interaction
    );

  if (isNaN(day) || isNaN(month)) {
    return client.errNormal(
      { error: "The date you gave is not a valid number", type: "editreply" },
      interaction
    );
  }

  day = parseInt(day);
  month = parseInt(month);

  if (!day || day > 31)
    return client.errNormal(
      { error: "Wrong day format!", type: "editreply" },
      interaction
    );
  if (!month || month > 12)
    return client.errNormal(
      { error: "Wrong month format!", type: "editreply" },
      interaction
    );

  const bday = `${day}/${month}`;

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      data.Birthday = bday;
      await data.save();

      client.succNormal(
        {
          text: "Your birthday is set",
          fields: [
            {
              name: "🎂┆Bday",
              value: `\`\`\`${bday}\`\`\``,
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
    console.error("Error in bday profile command:", err);
    client.errNormal(
      {
        error: "An error occurred while setting your birthday.",
        type: "editreply",
      },
      interaction
    );
  }
};
