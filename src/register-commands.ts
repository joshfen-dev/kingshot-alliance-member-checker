import "dotenv/config";

import { REST, Routes } from "discord.js";
import { checkAllianceMemberCommand } from "./commandDefinition";

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function registerCommands(): Promise<void> {
  const discordToken = getRequiredEnvVar("DISCORD_TOKEN");
  const discordClientId = getRequiredEnvVar("DISCORD_CLIENT_ID");
  const discordGuildId = getRequiredEnvVar("DISCORD_GUILD_ID");

  const rest = new REST({ version: "10" }).setToken(discordToken);
  const commands = [checkAllianceMemberCommand.toJSON()];

  await rest.put(
    Routes.applicationGuildCommands(discordClientId, discordGuildId),
    { body: commands },
  );

  console.log("Registered slash commands successfully.");
}

registerCommands().catch((error: unknown) => {
  console.error("Failed to register slash commands.");
  console.error(error);
  process.exitCode = 1;
});
