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

export const addAllianceMemberCommand = new SlashCommandBuilder()
  .setName("add-alliance-member")
  .setDescription("Add a player record to the Firestore alliance database.")
  .addStringOption((option) =>
    option
      .setName("player_id")
      .setDescription("The player ID to add.")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("alliance_name")
      .setDescription("The alliance name to associate with the player.")
      .setRequired(true),
  );
