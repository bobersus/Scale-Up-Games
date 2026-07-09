const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT) || 3000;
const contactWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const maxContactPayloadSize = 24 * 1024;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon"
};
const pageRoutes = new Map([
  ["/", "/index.html"],
  ["/home", "/index.html"],
  ["/about", "/index.html"],
  ["/featured-games", "/index.html"],
  ["/acquisition", "/index.html"],
  ["/contact", "/index.html"],
  ["/games", "/games.html"],
  ["/privacy-policy", "/privacy-policy.html"]
]);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "ScaleUp-Site" } }, (upstream) => {
        let body = "";

        upstream.setEncoding("utf8");
        upstream.on("data", (chunk) => {
          body += chunk;
        });
        upstream.on("end", () => {
          if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
            reject(new Error(`Roblox API returned ${upstream.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

function readBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;
    let failed = false;

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      if (failed) return;
      bytes += Buffer.byteLength(chunk);

      if (bytes > maxBytes) {
        failed = true;
        reject(new Error("Request body is too large"));
        request.destroy();
        return;
      }

      body += chunk;
    });
    request.on("end", () => {
      if (!failed) resolve(body);
    });
    request.on("error", (error) => {
      if (!failed) reject(error);
    });
  });
}

async function readJson(request) {
  const body = await readBody(request, maxContactPayloadSize);
  if (!body.trim()) return {};
  return JSON.parse(body);
}

function cleanDiscordText(value, maxLength = 1024) {
  const text = String(value || "").replace(/\r/g, "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function fieldValue(value) {
  return value || "Not provided";
}

function isRobloxLink(value) {
  return !value || /^https:\/\/(www\.)?roblox\.com(\/|$)/i.test(value);
}

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = JSON.stringify(payload);
    const request = https.request(
      {
        method: "POST",
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": "ScaleUp-Site"
        }
      },
      (upstream) => {
        let responseBody = "";
        upstream.setEncoding("utf8");
        upstream.on("data", (chunk) => {
          responseBody += chunk;
        });
        upstream.on("end", () => {
          if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
            reject(new Error(`Discord webhook returned ${upstream.statusCode}: ${responseBody.slice(0, 180)}`));
            return;
          }

          resolve();
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

async function handleContactApi(request, response) {
  if (request.method !== "POST") {
    response.writeHead(405, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Allow: "POST"
    });
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    if (!contactWebhookUrl) {
      sendJson(response, 500, { error: "Discord webhook is not configured" });
      return;
    }

    const payload = await readJson(request);
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

    await postJson(contactWebhookUrl, {
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
    });

    sendJson(response, 200, { ok: true });
  } catch (error) {
    console.warn(error);
    sendJson(response, 500, { error: "Unable to send contact request" });
  }
}

function cleanIds(value) {
  return String(value || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id));
}

async function handleRobloxApi(requestUrl, response) {
  const ids = cleanIds(requestUrl.searchParams.get("universeIds"));

  if (!ids.length) {
    sendJson(response, 400, { error: "Missing universeIds" });
    return true;
  }

  try {
    if (requestUrl.pathname === "/api/roblox/games") {
      const url = `https://games.roblox.com/v1/games?universeIds=${encodeURIComponent(ids.join(","))}`;
      sendJson(response, 200, await fetchJson(url));
      return true;
    }

    if (requestUrl.pathname === "/api/roblox/thumbnails") {
      const url =
        "https://thumbnails.roblox.com/v1/games/multiget/thumbnails" +
        `?universeIds=${encodeURIComponent(ids.join(","))}&countPerUniverse=1&defaults=true&size=768x432&format=Png`;
      sendJson(response, 200, await fetchJson(url));
      return true;
    }
  } catch (error) {
    sendJson(response, 502, { error: error.message });
    return true;
  }

  return false;
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://localhost:${port}`);
  const rawPathname = decodeURIComponent(requestUrl.pathname);
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/+$/, "") : rawPathname;

  if (pathname === "/api/status") {
    sendJson(response, 200, {
      ok: true,
      message: "ScaleUp API proxy is running"
    });
    return;
  }

  if (pathname.startsWith("/api/roblox/")) {
    handleRobloxApi(requestUrl, response);
    return;
  }

  if (pathname === "/api/contact") {
    handleContactApi(request, response);
    return;
  }

  const requestedPath = pageRoutes.get(pathname) || pathname;
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(root, "404.html"), (notFoundError, notFoundData) => {
        if (notFoundError) {
          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Not found");
          return;
        }

        response.writeHead(404, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        });
        response.end(notFoundData);
      });
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
});

server.listen(port, () => {
  console.log(`ScaleUp site is running at http://localhost:${port}`);
  console.log(`API check: http://localhost:${port}/api/status`);
});
