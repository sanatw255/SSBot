// Load environment variables
require("dotenv").config();

const mongoose = require("mongoose");
const Discord = require("discord.js");

// Set mongoose options
mongoose.set("strictQuery", false);

// Connect to your database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_TOKEN, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
}

// Import your schemas
const levelRewards = require("../src/database/models/levelRewards");
const levels = require("../src/database/models/levels");

// Create Discord client
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
  ],
});

async function fixExistingLevels() {
  // Check if environment variables exist
  if (!process.env.DISCORD_TOKEN) {
    console.error("DISCORD_TOKEN not found in environment variables");
    process.exit(1);
  }

  if (!process.env.MONGO_TOKEN) {
    console.error("MONGO_TOKEN not found in environment variables");
    process.exit(1);
  }

  // Connect to database first
  await connectDB();

  // Login to Discord
  await client.login(process.env.DISCORD_TOKEN);
  console.log("Bot logged in, fixing existing levels...");

  // Get all guilds
  for (const guild of client.guilds.cache.values()) {
    console.log(`Processing guild: ${guild.name} (ID: ${guild.id})`);

    // Get all level rewards for this guild - using correct field name
    const rewards = await levelRewards.find({ Guild: guild.id });
    console.log(`Found ${rewards.length} rewards for guild: ${guild.name}`);

    if (rewards.length === 0) {
      console.log(`No rewards found for guild: ${guild.name}`);
      continue;
    }

    // Debug: Show what rewards exist
    rewards.forEach((reward) => {
      console.log(`Reward: Level ${reward.Level} -> Role ${reward.Role}`);
    });

    // Get all users with levels in this guild - using correct field names
    const userLevels = await levels.find({ guildID: guild.id });
    console.log(
      `Found ${userLevels.length} users with levels in ${guild.name}`
    );

    if (userLevels.length === 0) {
      // Try alternative field name
      const userLevelsAlt = await levels.find({ Guild: guild.id });
      console.log(
        `Found ${userLevelsAlt.length} users with levels (alternative field) in ${guild.name}`
      );

      if (userLevelsAlt.length > 0) {
        userLevels.push(...userLevelsAlt);
      }
    }

    // Debug: Show some user data
    userLevels.slice(0, 3).forEach((user) => {
      console.log(
        `User: ${user.userID || user.User} - Level: ${
          user.level || user.Level
        } - XP: ${user.xp || user.XP}`
      );
    });

    for (const userLevel of userLevels) {
      try {
        const userId = userLevel.userID || userLevel.User;
        const userLevelNum = userLevel.level || userLevel.Level;

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
          console.log(`User ${userId} not found in guild`);
          continue;
        }

        console.log(`Processing ${member.user.tag} - Level: ${userLevelNum}`);

        // Check what rewards this user should have
        const eligibleRewards = rewards.filter(
          (reward) => userLevelNum >= reward.Level
        );
        console.log(
          `${member.user.tag} is eligible for ${eligibleRewards.length} rewards`
        );

        for (const reward of eligibleRewards) {
          const role = guild.roles.cache.get(reward.Role);
          if (role && !member.roles.cache.has(reward.Role)) {
            await member.roles.add(reward.Role);
            console.log(
              `✅ Added role ${role.name} to ${member.user.tag} for level ${reward.Level}`
            );
          } else if (role && member.roles.cache.has(reward.Role)) {
            console.log(`${member.user.tag} already has role ${role.name}`);
          } else if (!role) {
            console.log(`Role ${reward.Role} not found in guild`);
          }
        }
      } catch (error) {
        console.error(
          `Error processing user ${userLevel.userID || userLevel.User}:`,
          error.message
        );
      }
    }
  }

  console.log("✅ Finished processing all users!");
  await mongoose.disconnect();
  process.exit(0);
}

fixExistingLevels().catch((error) => {
  console.error("Script error:", error);
  process.exit(1);
});
