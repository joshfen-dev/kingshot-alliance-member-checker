import { findPlayerRecordsByPlayerId, PlayerRecord } from "./playerDataSource";

export interface AllianceLookupResult {
  matches: PlayerRecord[];
  uniqueAllianceNames: string[];
}

export async function findAllianceMembersByPlayerId(
  idToCheck: string,
): Promise<AllianceLookupResult> {
  const matches = await findPlayerRecordsByPlayerId(idToCheck);

  const uniqueAllianceNames = Array.from(
    new Set(matches.map((playerRecord) => playerRecord.allianceName)),
  );

  return {
    matches,
    uniqueAllianceNames,
  };
}

export function formatAllianceCheckMessage(
  idToCheck: string,
  lookupResult: AllianceLookupResult,
): string {
  if (lookupResult.uniqueAllianceNames.length === 0) {
    return `No match found for member ${idToCheck}`;
  }

  if (lookupResult.uniqueAllianceNames.length === 1) {
    return `Match found for member ${idToCheck} in alliance ${lookupResult.uniqueAllianceNames[0]}`;
  }

  return `Multiple matches found for member ${idToCheck} in alliances ${lookupResult.uniqueAllianceNames.join(", ")}`;
}
