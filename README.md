# kingshot-alliance-member-checker

Discord slash-command service that checks whether a player ID belongs to an alliance listed in `alliance.json`.

## What it does

Once configured, this app responds to the slash command:

`/check-alliance-member playerid:<player-id>`

Discord sends the command to your HTTP interactions endpoint, the app checks `alliance.json`, and it replies with either:

- `Match found for member 12345 in alliance ExampleClan`
- `No match found for member 12345`

## Project structure

- `alliance.json`: Your alliance data source
- `src/allianceLookup.js`: Shared lookup logic
- `src/checkAllianceMemberCli.js`: Local CLI testing without Discord
- `src/register-commands.js`: Registers the slash command in your Discord server
- `src/server.js`: HTTP interactions server for Discord

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
8. Install dependencies:

```bash
npm install
```

9. Register the slash command in your server:

```bash
npm run register-commands
```

10. Start the local HTTP server:

```bash
npm start
```

11. Expose your local server to the internet with a tunnel such as `cloudflared` or `ngrok`.
12. In the Discord Developer Portal, set the Interactions Endpoint URL to:

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
    "allianceName": "ExampleClan",
    "allianceMemberIds": ["11111", "222222", "333333"]
  }
]
```

## Notes

- The app now uses Discord HTTP interactions instead of a persistent Gateway bot connection.
- Guild command registration is used so updates appear quickly while you are developing.
- If you later want this slash command available globally, switch registration from guild commands to global commands in `src/register-commands.js`.
