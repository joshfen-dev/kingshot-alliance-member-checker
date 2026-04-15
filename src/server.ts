import "dotenv/config";

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import nacl from "tweetnacl";
import {
  findAllianceMemberByPlayerId,
  formatAllianceCheckMessage,
  PlayerRecord,
} from "./allianceLookup";

const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_APPLICATION_COMMAND = 2;
const INTERACTION_RESPONSE_TYPE_PONG = 1;
const INTERACTION_RESPONSE_TYPE_CHANNEL_MESSAGE_WITH_SOURCE = 4;
const MESSAGE_FLAG_EPHEMERAL = 1 << 6;
const EMBED_COLOR_SUCCESS = 0x57f287;
const EMBED_COLOR_ERROR = 0xed4245;

interface DiscordInteractionOption {
  name: string;
  value?: string | number | boolean;
}

interface DiscordInteractionData {
  name?: string;
  options?: DiscordInteractionOption[];
}

interface DiscordInteractionPayload {
  type: number;
  data?: DiscordInteractionData;
}

interface InteractionResponse {
  statusCode: number;
  body: unknown;
}

interface AllianceCheckEmbed {
  title: string;
  color: number;
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const port = Number(process.env.PORT || 3000);
const discordPublicKey = getRequiredEnvVar("DISCORD_PUBLIC_KEY");

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const responseBody = JSON.stringify(payload);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(responseBody),
  });
  res.end(responseBody);
}

function sendText(res: ServerResponse, statusCode: number, payload: string): void {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      rawBody += chunk;
    });
    req.on("end", () => resolve(rawBody));
    req.on("error", reject);
  });
}

function isVerifiedDiscordRequest(
  signature: string,
  timestamp: string,
  rawBody: string,
): boolean {
  return nacl.sign.detached.verify(
    Buffer.from(timestamp + rawBody),
    Buffer.from(signature, "hex"),
    Buffer.from(discordPublicKey, "hex"),
  );
}

function getCommandOptionValue(
  interaction: DiscordInteractionPayload,
  optionName: string,
): string | number | boolean | null {
  const matchingOption = interaction.data?.options?.find(
    (option) => option.name === optionName,
  );

  return matchingOption?.value ?? null;
}

function buildAllianceCheckEmbed(
  playerId: string,
  matchedAlliance: PlayerRecord | null,
): AllianceCheckEmbed {
  const matchFound = Boolean(matchedAlliance);
  const allianceName = matchedAlliance ? matchedAlliance.allianceName : "None";

  return {
    title: "Alliance Check Result",
    color: matchFound ? EMBED_COLOR_SUCCESS : EMBED_COLOR_ERROR,
    fields: [
      {
        name: "Player ID",
        value: playerId,
        inline: true,
      },
      {
        name: "Result",
        value: matchFound ? "Match found" : "No match found",
        inline: true,
      },
      {
        name: "Alliance",
        value: allianceName,
        inline: false,
      },
    ],
  };
}

async function handleInteraction(
  interaction: DiscordInteractionPayload,
): Promise<InteractionResponse> {
  if (interaction.type === INTERACTION_TYPE_PING) {
    return {
      statusCode: 200,
      body: { type: INTERACTION_RESPONSE_TYPE_PONG },
    };
  }

  if (
    interaction.type !== INTERACTION_TYPE_APPLICATION_COMMAND ||
    interaction.data?.name !== "check-alliance-member"
  ) {
    return {
      statusCode: 400,
      body: {
        error: "Unsupported interaction.",
      },
    };
  }

  const playerId = String(
    getCommandOptionValue(interaction, "player_id") ?? "",
  ).trim();

  if (!playerId) {
    return {
      statusCode: 400,
      body: {
        type: INTERACTION_RESPONSE_TYPE_CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Missing required option: playerId",
        },
      },
    };
  }

  const matchedAlliance = await findAllianceMemberByPlayerId(playerId);

  return {
    statusCode: 200,
    body: {
      type: INTERACTION_RESPONSE_TYPE_CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: formatAllianceCheckMessage(playerId, matchedAlliance),
        flags: MESSAGE_FLAG_EPHEMERAL,
        embeds: [buildAllianceCheckEmbed(playerId, matchedAlliance)],
        allowed_mentions: {
          parse: [],
        },
      },
    },
  };
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === "GET" && req.url === "/") {
    sendText(res, 200, "Discord interaction service is running.");
    return;
  }

  if (req.method !== "POST" || req.url !== "/interactions") {
    sendJson(res, 404, { error: "Not found." });
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    if (
      typeof signature !== "string" ||
      typeof timestamp !== "string" ||
      !isVerifiedDiscordRequest(signature, timestamp, rawBody)
    ) {
      sendText(res, 401, "invalid request signature");
      return;
    }

    const interaction = JSON.parse(rawBody) as DiscordInteractionPayload;
    const response = await handleInteraction(interaction);
    sendJson(res, response.statusCode, response.body);
  } catch (error: unknown) {
    console.error("Failed to handle Discord interaction.", error);
    sendJson(res, 500, { error: "Internal server error." });
  }
});

server.listen(port, () => {
  console.log(`Discord interaction server listening on port ${port}`);
});
