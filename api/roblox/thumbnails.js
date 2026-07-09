const { cleanIds, fetchJson, sendJson } = require("../_utils");

module.exports = async function handler(request, response) {
  const ids = cleanIds(request.query.universeIds);

  if (!ids.length) {
    sendJson(response, 400, { error: "Missing universeIds" });
    return;
  }

  try {
    const url =
      "https://thumbnails.roblox.com/v1/games/multiget/thumbnails" +
      `?universeIds=${encodeURIComponent(ids.join(","))}&countPerUniverse=1&defaults=true&size=768x432&format=Png`;
    sendJson(response, 200, await fetchJson(url));
  } catch (error) {
    sendJson(response, 502, { error: error.message });
  }
};
