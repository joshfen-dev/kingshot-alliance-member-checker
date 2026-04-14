require("dotenv").config();

const http = require("node:http");
const nacl = require("tweetnacl");
const {
  findAllianceByMemberId,
  formatAllianceCheckMessage,
} = require("./allianceLookup");

const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_APPLICATION_COMMAND = 2;
const INTERACTION_RESPONSE_TYPE_PONG = 1;
const INTERACTION_RESPONSE_TYPE_CHANNEL_MESSAGE_WITH_SOURCE = 4;
const MESSAGE_FLAG_EPHEMERAL = 1 << 6;
const EMBED_COLOR_SUCCESS = 0x57f287;
const EMBED_COLOR_ERROR = 0xed4245;

const port = Number(process.env.PORT || 3000);
const discordPublicKey = process.env.DISCORD_PUBLIC_KEY;

if (!discordPublicKey) {
  throw new Error("Missing required environment variable: DISCORD_PUBLIC_KEY");
}

function sendJson(res, statusCode, payload) {
  const responseBody = JSON.stringify(payload);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(responseBody),
  });
  res.end(responseBody);
}

function sendText(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      rawBody += chunk;
    });
    req.on("end", () => resolve(rawBody));
    req.on("error", reject);
  });
}

function isVerifiedDiscordRequest(signature, timestamp, rawBody) {
  if (!signature || !timestamp) {
    return false;
  }

  return nacl.sign.detached.verify(
    Buffer.from(timestamp + rawBody),
    Buffer.from(signature, "hex"),
    Buffer.from(discordPublicKey, "hex"),
  );
}

function getCommandOptionValue(interaction, optionName) {
  const matchingOption = interaction.data?.options?.find(
    (option) => option.name === optionName,
  );

  return matchingOption?.value ?? null;
}

function buildAllianceCheckEmbed(playerId, matchedAlliance) {
  const matchFound = Boolean(matchedAlliance);

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
        value: matchFound ? matchedAlliance.allianceName : "None",
        inline: false,
      },
    ],
  };
}

async function handleInteraction(interaction) {
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
    getCommandOptionValue(interaction, "playerid") ?? "",
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

  const matchedAlliance = await findAllianceByMemberId(playerId);

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

const server = http.createServer(async (req, res) => {
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

    const interaction = JSON.parse(rawBody);
    const response = await handleInteraction(interaction);
    sendJson(res, response.statusCode, response.body);
  } catch (error) {
    console.error("Failed to handle Discord interaction.", error);
    sendJson(res, 500, { error: "Internal server error." });
  }
});

server.listen(port, () => {
  console.log(`Discord interaction server listening on port ${port}`);
});
