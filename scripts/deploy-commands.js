require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.DISCORD_TOKEN;

// Read all command files from src/commands (recursively if needed)
const commands = [];
const commandsPath = path.join(__dirname, "../src/commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Started refreshing global application (/) commands.");

    await rest.put(
      Routes.applicationCommands(CLIENT_ID), // <-- GLOBAL
      { body: commands }
    );

    console.log("Successfully reloaded global application (/) commands.");
  } catch (error) {
    console.error("Error refreshing commands:", error);
  }
})();
