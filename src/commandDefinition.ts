import { SlashCommandBuilder } from "discord.js";

export const checkAllianceMemberCommand = new SlashCommandBuilder()
  .setName("check-alliance-member")
  .setDescription("Check whether a player belongs to a top 5 alliance via their player ID")
  .addStringOption((option) =>
    option
      .setName("player_id")
      .setDescription("The player ID to search for.")
      .setRequired(true),
  );
