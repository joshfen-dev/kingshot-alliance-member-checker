import {
  findAllianceMemberByPlayerId,
  formatAllianceCheckMessage,
} from "./allianceLookup";

async function run(): Promise<void> {
  const playerId = process.argv[2]?.trim();

  if (!playerId) {
    console.error("Usage: npm run check-member -- <member-id>");
    process.exitCode = 1;
    return;
  }

  const matchedAlliance = await findAllianceMemberByPlayerId(playerId);
  console.log(formatAllianceCheckMessage(playerId, matchedAlliance));
}

run().catch((error: unknown) => {
  console.error("Failed to check alliance membership.", error);
  process.exitCode = 1;
});
