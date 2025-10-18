const Discord = require('discord.js');

module.exports = async (client, interaction, args) => {
    client.embed({
        title: `📘・Owner information`,
        desc: `____________________________`,
        thumbnail: client.user.avatarURL({ dynamic: true, size: 1024 }),
        fields: [{
            name: "👑┆Owner name",
            value: `Sanat`,
            inline: true,
        },
        {
            name: "🏷┆Discord tag",
            value: `sanat.w2`,
            inline: true,
        },
        {
            name: "🏢┆Organization",
            value: `SanatCreatives`,
            inline: true,
        },
        {
            name: "🌐┆Website",
            value: `[https://sanatcreatives.com](https://sanatcreatives.com)`,
            inline: true,
        }],
        type: 'editreply'
    }, interaction)
}

 