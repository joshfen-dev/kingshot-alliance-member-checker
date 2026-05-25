import "dotenv/config";

import {
  loadAllianceDataFromJson,
  syncPlayerRecordsToFirestore,
} from "./playerDataSource";

async function run(): Promise<void> {
  const allianceData = await loadAllianceDataFromJson();
  const result = await syncPlayerRecordsToFirestore(allianceData);

  console.log(`Synced ${result.writtenCount} player records to Firestore.`);
}

run().catch((error: unknown) => {
  console.error("Failed to sync alliance data to Firestore.", error);
  process.exitCode = 1;
});
