require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.DISCORD_TOKEN;

// Read all command files from src/interactions/Command
const commands = [];
const commandsPath = path.join(__dirname, "../src/interactions/Command");

// Function to recursively read all .js files
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (file.endsWith(".js")) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

const commandFiles = getAllFiles(commandsPath);

console.log(`Found ${commandFiles.length} command files`);

for (const filePath of commandFiles) {
  try {
    const command = require(filePath);
    if (command.data) {
      commands.push(command.data.toJSON());
      console.log(`✓ Loaded: ${command.data.name}`);
    }
  } catch (error) {
    console.error(`✗ Error loading ${filePath}:`, error.message);
  }
}

console.log(`\nTotal commands to deploy: ${commands.length}`);

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("\nStarted refreshing global application (/) commands...");

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log("✅ Successfully reloaded global application (/) commands!");
  } catch (error) {
    console.error("❌ Error refreshing commands:", error);
  }
})();
