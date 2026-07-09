const {
  cleanDiscordText,
  fieldValue,
  isRobloxLink,
  sendJson
} = require("./_utils");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const contactWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!contactWebhookUrl) {
    sendJson(response, 500, { error: "Discord webhook is not configured" });
    return;
  }

  try {
    const payload = typeof request.body === "object" && request.body
      ? request.body
      : JSON.parse(request.body || "{}");
    const name = cleanDiscordText(payload.name, 256);
    const game = cleanDiscordText(payload.game);
    const discord = cleanDiscordText(payload.discord, 256);
    const message = cleanDiscordText(payload.message);

    if (!name || !discord) {
      sendJson(response, 400, { error: "Name and Discord tag are required" });
      return;
    }

    if (!isRobloxLink(game)) {
      sendJson(response, 400, { error: "Roblox link must start with https://www.roblox.com or https://roblox.com" });
      return;
    }

    const discordResponse = await fetch(contactWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ScaleUp-Site"
      },
      body: JSON.stringify({
        username: "ScaleUp Contact",
        allowed_mentions: {
          parse: []
        },
        embeds: [
          {
            title: "New ScaleUp Games Request",
            description: "A developer submitted the Contact Us form.",
            color: 0xbaff22,
            fields: [
              {
                name: "Your Name",
                value: fieldValue(name),
                inline: true
              },
              {
                name: "Discord tag",
                value: fieldValue(discord),
                inline: true
              },
              {
                name: "Roblox Game Link",
                value: fieldValue(game),
                inline: false
              },
              {
                name: "Game details and current metrics",
                value: fieldValue(message),
                inline: false
              }
            ],
            footer: {
              text: "ScaleUp Games Contact Us"
            },
            timestamp: new Date().toISOString()
          }
        ]
      })
    });

    if (!discordResponse.ok) {
      const body = await discordResponse.text();
      throw new Error(`Discord webhook returned ${discordResponse.status}: ${body.slice(0, 180)}`);
    }

    sendJson(response, 200, { ok: true });
  } catch (error) {
    console.warn(error);
    sendJson(response, 500, { error: "Unable to send contact request" });
  }
};
