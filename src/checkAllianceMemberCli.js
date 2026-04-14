const {
  findAllianceByMemberId,
  formatAllianceCheckMessage,
} = require("./allianceLookup");

async function run() {
  const idToCheck = process.argv[2]?.trim();

  if (!idToCheck) {
    console.error("Usage: npm run check-member -- <member-id>");
    process.exitCode = 1;
    return;
  }

  const matchedAlliance = await findAllianceByMemberId(idToCheck);
  console.log(formatAllianceCheckMessage(idToCheck, matchedAlliance));
}

run().catch((error) => {
  console.error("Failed to check alliance membership.", error);
  process.exitCode = 1;
});
