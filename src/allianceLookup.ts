import { readFile } from "node:fs/promises";
import path from "node:path";

export interface PlayerRecord {
  playerId: string;
  allianceName: string;
}

const allianceFilePath = path.resolve(__dirname, "..", "alliance.json");

function isPlayerRecord(value: unknown): value is PlayerRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.playerId === "string" &&
    typeof candidate.allianceName === "string"
  );
}

export async function loadAllianceData(): Promise<PlayerRecord[]> {
  const rawAllianceData = await readFile(allianceFilePath, "utf8");
  const parsedAllianceData: unknown = JSON.parse(rawAllianceData);

  if (!Array.isArray(parsedAllianceData)) {
    throw new Error("alliance.json must contain an array of player records.");
  }

  if (!parsedAllianceData.every(isPlayerRecord)) {
    throw new Error(
      "Each alliance.json record must include string values for playerId and allianceName.",
    );
  }

  return parsedAllianceData;
}

export async function findAllianceMemberByPlayerId(
  idToCheck: string,
): Promise<PlayerRecord | null> {
  const normalizedId = String(idToCheck).trim();
  const allianceData = await loadAllianceData();

  const matchedAllianceMember =
    allianceData.find((playerRecord) => playerRecord.playerId.trim() === normalizedId) ??
    null;

  return matchedAllianceMember;
}

export function formatAllianceCheckMessage(
  idToCheck: string,
  matchedAllianceMember: PlayerRecord | null,
): string {
  if (matchedAllianceMember) {
    return `Match found for member ${idToCheck} in alliance ${matchedAllianceMember.allianceName}`;
  }

  return `No match found for member ${idToCheck}`;
}
