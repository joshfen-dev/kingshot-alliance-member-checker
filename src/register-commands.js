require("dotenv").config();

const { REST, Routes } = require("discord.js");
const { checkAllianceMemberCommand } = require("./commandDefinition");

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

function assertRequiredEnvVar(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

async function registerCommands() {
  assertRequiredEnvVar("DISCORD_TOKEN", DISCORD_TOKEN);
  assertRequiredEnvVar("DISCORD_CLIENT_ID", DISCORD_CLIENT_ID);
  assertRequiredEnvVar("DISCORD_GUILD_ID", DISCORD_GUILD_ID);

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  const commands = [checkAllianceMemberCommand.toJSON()];

  await rest.put(
    Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
    { body: commands },
  );

  console.log("Registered slash commands successfully.");
}

registerCommands().catch((error) => {
  console.error("Failed to register slash commands.");
  console.error(error);
  process.exitCode = 1;
});
