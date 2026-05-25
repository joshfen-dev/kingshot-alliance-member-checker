# kingshot-alliance-member-checker

Discord slash-command service that checks whether a player ID belongs to an alliance listed in `alliance.json` or stored in Firestore.

The app is written in TypeScript and compiles to `dist/` before running.

## What it does

Once configured, this app responds to the slash command:

`/check-alliance-member player_id:<player-id>`

Discord sends the command to your HTTP interactions endpoint, the app checks `alliance.json`, and it replies with either:

- `Match found for member 12345 in alliance ExampleClan`
- `No match found for member 12345`

## Project structure

- `alliance.json`: Your local player data source and Firestore seed data
- Each record in `alliance.json` can grow later with extra fields such as `playerName`
- `src/allianceLookup.ts`: Shared lookup logic
- `src/playerDataSource.ts`: JSON and Firestore backend logic
- `src/checkAllianceMemberCli.ts`: Local CLI testing without Discord
- `src/register-commands.ts`: Registers the slash command in your Discord server
- `src/server.ts`: HTTP interactions server for Discord
- `src/syncFirestoreFromJson.ts`: Seeds Firestore from `alliance.json`

## Setup

1. Create a Discord application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Add a bot user to the application.
3. In the application settings, copy:
   - the bot token
   - the application client ID
   - the application public key
4. Under `OAuth2 > URL Generator`, select:
   - `bot`
   - `applications.commands`
5. In bot permissions, include at least:
   - `Send Messages`
6. Use the generated URL to invite the bot to your server.
7. Copy `.env.example` to `.env` and fill in:
   - `DISCORD_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_GUILD_ID`
   - `DISCORD_PUBLIC_KEY`
   - `PORT`
   - `DATA_STORE`
   - `FIRESTORE_COLLECTION`
   - `FIRESTORE_PROJECT_ID` if needed outside Cloud Run
8. Install dependencies:

```bash
npm install
```

9. Build the TypeScript project:

```bash
npm run build
```

10. Register the slash command in your server:

```bash
npm run register-commands
```

11. Start the local HTTP server:

```bash
npm start
```

12. Expose your local server to the internet with a tunnel such as `cloudflared` or `ngrok`.
13. In the Discord Developer Portal, set the Interactions Endpoint URL to:

```text
https://your-public-url.example/interactions
```

Discord will validate the endpoint by sending a signed `PING` request, and the app will reply with a `PONG`.

## Local testing

You can test the lookup locally without Discord by running:

```bash
npm run check-member -- 11111
```

Example output:

- `Match found for member 11111 in alliance ExampleClan`
- `No match found for member 99999`

## Firestore mode

The app can read player records from either:

- `DATA_STORE=json`
- `DATA_STORE=firestore`

When `DATA_STORE=firestore`, the app queries the Firestore collection named by `FIRESTORE_COLLECTION` and expects documents with at least:

```json
{
  "playerId": "266253364",
  "allianceName": "HHH"
}
```

The Node.js server client uses Application Default Credentials. That means:

- on Cloud Run, the service account is used automatically
- locally, use `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS`

To seed Firestore from your current `alliance.json`:

```bash
DATA_STORE=firestore npm run sync-firestore
```

This script de-duplicates exact `{ playerId, allianceName }` pairs and writes deterministic Firestore document IDs so repeated syncs update the same records instead of creating new duplicates.

You can also verify the local service is up:

```bash
curl http://localhost:3000/
```

Expected output:

```text
Discord interaction service is running.
```

## Example alliance.json

```json
[
  {
    "playerId": "11111",
    "allianceName": "ExampleClan"
  },
  {
    "playerId": "222222",
    "allianceName": "ExampleClan"
  },
  {
    "playerId": "333333",
    "allianceName": "ExampleClan"
  },
  {
    "playerId": "555555",
    "allianceName": "AnotherClan"
  },
  {
    "playerId": "666666",
    "allianceName": "AnotherClan"
  }
]
```

## Notes

- The app now uses Discord HTTP interactions instead of a persistent Gateway bot connection.
- Guild command registration is used so updates appear quickly while you are developing.
- If you later want this slash command available globally, switch registration from guild commands to global commands in `src/register-commands.ts`.
