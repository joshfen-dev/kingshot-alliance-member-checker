const fs = require("node:fs/promises");
const path = require("node:path");

const allianceFilePath = path.resolve(__dirname, "..", "alliance.json");

async function loadAllianceData() {
  const rawAllianceData = await fs.readFile(allianceFilePath, "utf8");
  const parsedAllianceData = JSON.parse(rawAllianceData);

  if (!Array.isArray(parsedAllianceData)) {
    throw new Error("alliance.json must contain an array of player records.");
  }

  return parsedAllianceData;
}

async function findAllianceByMemberId(idToCheck) {
  const normalizedId = String(idToCheck).trim();
  const allianceData = await loadAllianceData();

  const matchedAlliance = allianceData.find((playerRecord) =>
    typeof playerRecord?.playerId === "string" &&
    playerRecord.playerId.trim() === normalizedId,
  );

  return matchedAlliance ?? null;
}

function formatAllianceCheckMessage(idToCheck, matchedAlliance) {
  if (matchedAlliance) {
    return `Match found for member ${idToCheck} in alliance ${matchedAlliance.allianceName}`;
  }

  return `No match found for member ${idToCheck}`;
}

module.exports = {
  findAllianceByMemberId,
  formatAllianceCheckMessage,
};
