import { SlashCommandBuilder } from "discord.js";

export const checkAllianceMemberCommand = new SlashCommandBuilder()
  .setName("check-alliance-member")
  .setDescription("Check whether a player ID belongs to an alliance in alliance.json.")
  .addStringOption((option) =>
    option
      .setName("playerid")
      .setDescription("The player ID to search for.")
      .setRequired(true),
  );
