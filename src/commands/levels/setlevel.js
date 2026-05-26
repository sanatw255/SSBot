 const Discord = require("discord.js");
 const Functions = require("../../database/models/functions");
 const Schema = require("../../database/models/levels");
 const levelRewards = require("../../database/models/levelRewards");

 module.exports = async (client, interaction, args) => {
   const data = await Functions.findOne({ Guild: interaction.guild.id });

   const perms = await client.checkUserPerms(
     {
       flags: [Discord.PermissionsBitField.Flags.ManageMessages],
       perms: [Discord.PermissionsBitField.Flags.ManageMessages],
     },
     interaction
   );

   if (perms == false) return;

   if (data && data.Levels == true) {
     try {
       const target = interaction.options.getUser("user");
       const level = interaction.options.getNumber("level");

       if (!target) {
         return client.errNormal(
           {
             error: "User not found!",
             type: "editreply",
           },
           interaction
         );
       }

       const user = await client.setLevel(
         target.id,
         interaction.guild.id,
         level
       );

       if (!user) {
         return client.errNormal(
           {
             error: "This user has no level data!",
             type: "editreply",
           },
           interaction
         );
       }

       // Assign role reward if one exists for this level
       const rewardData = await levelRewards.findOne({
         Guild: interaction.guild.id,
         Level: level,
       });

       if (rewardData) {
         const member = await interaction.guild.members.fetch(target.id).catch(() => null);
         if (member) {
           await member.roles.add(rewardData.Role).catch(console.error);
         }
       }

       client.succNormal(
         {
           text: `Level has been modified successfully`,
           fields: [
             {
               name: "🆕┆New Level",
               value: `${user.level}`,
               inline: true,
             },
             {
               name: "👤┆User",
               value: `${target} (${target.tag})`,
               inline: true,
             },
             {
               name: "🎁┆Role Reward",
               value: rewardData ? `<@&${rewardData.Role}> assigned!` : `None for level ${level}`,
               inline: true,
             },
           ],
           type: "editreply",
         },
         interaction
       );
     } catch (error) {
       console.error("[LEVELS-SETLEVEL]", error);
       client.errNormal(
         {
           error: "An error occurred!",
           type: "editreply",
         },
         interaction
       );
     }
   } else {
     client.errNormal(
       {
         error: "Levels are disabled in this guild!",
         type: "editreply",
       },
       interaction
     );
   }
 };
