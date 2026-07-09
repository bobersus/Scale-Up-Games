function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function cleanIds(value) {
  return String(value || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id));
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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ScaleUp-Site"
    }
  });

  if (!response.ok) {
    throw new Error(`Upstream API returned ${response.status}`);
  }

  return response.json();
}

module.exports = {
  cleanDiscordText,
  cleanIds,
  fetchJson,
  fieldValue,
  isRobloxLink,
  sendJson
};
