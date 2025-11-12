const Discord = require("discord.js");

const Schema = require("../../database/models/birthday");

module.exports = async (client, interaction, args) => {
  const months = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  };

  const day = interaction.options.getNumber("day");
  const month = interaction.options.getNumber("month");

  if (!day || day > 31)
    return client.errNormal(
      {
        error: "Wrong day format!",
        type: "editreply",
      },
      interaction
    );

  if (!month || month > 12)
    return client.errNormal(
      {
        error: "Wrong month format!",
        type: "editreply",
      },
      interaction
    );

  const convertedDay = suffixes(day);
  const convertedMonth = months[month];
  const birthdayString = `${convertedDay} of ${convertedMonth}`;

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      User: interaction.user.id,
    });

    if (data) {
      data.Birthday = birthdayString;
      await data.save();
    } else {
      await new Schema({
        Guild: interaction.guild.id,
        User: interaction.user.id,
        Birthday: birthdayString,
      }).save();
    }

    client.succNormal(
      {
        text: `Birthday has been set successfully`,
        fields: [
          {
            name: `${client.emotes.normal.birthday}┆Birthday`,
            value: `${birthdayString}`,
          },
        ],
        type: "editreply",
      },
      interaction
    );
  } catch (err) {
    console.error("Error in set birthday command:", err);
    client.errNormal(
      {
        error: "An error occurred while setting the birthday.",
        type: "editreply",
      },
      interaction
    );
  }
};

function suffixes(number) {
  const converted = number.toString();

  const lastChar = converted.charAt(converted.length - 1);

  return lastChar == "1"
    ? `${converted}st`
    : lastChar == "2"
    ? `${converted}nd`
    : lastChar == "3"
    ? `${converted}rd`
    : `${converted}th`;
}
