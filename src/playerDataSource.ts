import { readFile } from "node:fs/promises";
import path from "node:path";

import { Firestore, Settings } from "@google-cloud/firestore";

export interface PlayerRecord {
  playerId: string;
  allianceName: string;
}

export type DataStoreType = "json" | "firestore";

export interface CreatePlayerRecordResult {
  created: boolean;
  record: PlayerRecord;
}

const allianceFilePath = path.resolve(__dirname, "..", "alliance.json");
const firestoreCollectionName = process.env.FIRESTORE_COLLECTION || "players";

let firestoreClient: Firestore | null = null;

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

function normalizePlayerRecord(record: PlayerRecord): PlayerRecord {
  return {
    playerId: record.playerId.trim(),
    allianceName: record.allianceName.trim(),
  };
}

function getFirestoreClient(): Firestore {
  if (firestoreClient) {
    return firestoreClient;
  }

  const settings: Settings = {};

  if (process.env.FIRESTORE_PROJECT_ID) {
    settings.projectId = process.env.FIRESTORE_PROJECT_ID;
  }

  if (process.env.FIRESTORE_DATABASE_ID) {
    settings.databaseId = process.env.FIRESTORE_DATABASE_ID;
  }

  firestoreClient = new Firestore(settings);
  return firestoreClient;
}

export function getConfiguredDataStore(): DataStoreType {
  return process.env.DATA_STORE === "firestore" ? "firestore" : "json";
}

export async function loadAllianceDataFromJson(): Promise<PlayerRecord[]> {
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

export async function findPlayerRecordsByPlayerId(
  idToCheck: string,
): Promise<PlayerRecord[]> {
  const normalizedId = String(idToCheck).trim();

  if (!normalizedId) {
    return [];
  }

  if (getConfiguredDataStore() === "firestore") {
    const snapshot = await getFirestoreClient()
      .collection(firestoreCollectionName)
      .where("playerId", "==", normalizedId)
      .get();

    return snapshot.docs
      .map((doc) => doc.data())
      .filter(isPlayerRecord)
      .map(normalizePlayerRecord);
  }

  const allianceData = await loadAllianceDataFromJson();

  return allianceData.filter(
    (playerRecord) => playerRecord.playerId.trim() === normalizedId,
  );
}

export function dedupeExactPlayerRecords(records: PlayerRecord[]): PlayerRecord[] {
  const seen = new Set<string>();

  return records.filter((record) => {
    const normalizedRecord = normalizePlayerRecord(record);
    const key = `${normalizedRecord.playerId}::${normalizedRecord.allianceName}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    record.playerId = normalizedRecord.playerId;
    record.allianceName = normalizedRecord.allianceName;
    return true;
  });
}

export function buildFirestoreDocumentId(record: PlayerRecord): string {
  return encodeURIComponent(`${record.playerId.trim()}::${record.allianceName.trim()}`);
}

export async function createPlayerRecord(
  record: PlayerRecord,
): Promise<CreatePlayerRecordResult> {
  const normalizedRecord = normalizePlayerRecord(record);

  if (!normalizedRecord.playerId || !normalizedRecord.allianceName) {
    throw new Error("playerId and allianceName are required.");
  }

  if (getConfiguredDataStore() !== "firestore") {
    throw new Error("Creating player records is only supported when DATA_STORE=firestore.");
  }

  const firestore = getFirestoreClient();
  const documentRef = firestore
    .collection(firestoreCollectionName)
    .doc(buildFirestoreDocumentId(normalizedRecord));
  const existingDocument = await documentRef.get();

  if (existingDocument.exists) {
    return {
      created: false,
      record: normalizedRecord,
    };
  }

  await documentRef.set(normalizedRecord);

  return {
    created: true,
    record: normalizedRecord,
  };
}

export async function syncPlayerRecordsToFirestore(
  records: PlayerRecord[],
): Promise<{ writtenCount: number }> {
  const firestore = getFirestoreClient();
  const dedupedRecords = dedupeExactPlayerRecords(records);

  for (let start = 0; start < dedupedRecords.length; start += 500) {
    const batch = firestore.batch();
    const chunk = dedupedRecords.slice(start, start + 500);

    for (const record of chunk) {
      const documentRef = firestore
        .collection(firestoreCollectionName)
        .doc(buildFirestoreDocumentId(record));

      batch.set(documentRef, {
        playerId: record.playerId.trim(),
        allianceName: record.allianceName.trim(),
      });
    }

    await batch.commit();
  }

  return {
    writtenCount: dedupedRecords.length,
  };
}
