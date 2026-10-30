const sharp = require("sharp");

const ALLOWED_HOST = "cdn.atsu.moe";
const MAX_BYTES = 4 * 1024 * 1024; // Vercel caps responses at ~4.5 MB

module.exports = async (req, res) => {
  const target = req.query.url;

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).send("Bad url");
  }
  if (parsed.hostname !== ALLOWED_HOST) {
    return res.status(403).send("Forbidden host");
  }

  const upstream = await fetch(target, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  });
  if (!upstream.ok) {
    return res.status(upstream.status).send(`Upstream error ${upstream.status}`);
  }

  const input = Buffer.from(await upstream.arrayBuffer());

  // Lower the quality until the result fits under the response limit
  let jpg;
  for (const quality of [88, 80, 70, 60]) {
    jpg = await sharp(input).jpeg({ quality, progressive: true }).toBuffer();
    if (jpg.length <= MAX_BYTES) break;
  }

  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, s-maxage=31536000, max-age=86400, immutable");
  res.status(200).send(jpg);
};
