const BACKEND_URL = "https://glad-libs-backend.onrender.com";

const BOT_UA = /bot|crawl|spider|facebook|twitter|slack|discord|telegram|whatsapp|linkedin|pinterest|preview|embed|fetch|curl/i;

function isBot(request) {
  const ua = request.headers.get("user-agent") || "";
  return BOT_UA.test(ua);
}

function buildHtml({ title, description, url, image }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <meta name="description" content="${description}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="${url}"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${description}"/>
  <meta property="og:image" content="${image}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${description}"/>
  <meta name="twitter:image" content="${image}"/>
</head>
<body>Redirecting...</body>
</html>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default async function handler(request, context) {
  if (!isBot(request)) {
    return;
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const origin = url.origin;
  const image = `${origin}/og-image.png`;

  // Match /start/:code
  const startMatch = path.match(/^\/start\/([A-Z0-9]{6})$/);
  if (startMatch) {
    const code = startMatch[1];
    try {
      const res = await fetch(`${BACKEND_URL}/story/get/${code}`);
      if (res.ok) {
        const data = await res.json();
        const storyTitle = data.story?.title;
        if (storyTitle) {
          const safe = escapeHtml(storyTitle);
          return new Response(
            buildHtml({
              title: `Play "${safe}" on Glad Libs`,
              description: `You've been invited to fill in the blanks for "${safe}". Tap to play!`,
              url: `${origin}${path}`,
              image,
            }),
            { headers: { "content-type": "text/html; charset=utf-8" } }
          );
        }
      }
    } catch (_) {
      // fall through to default
    }
    return new Response(
      buildHtml({
        title: "You're invited to play Glad Libs!",
        description: "Someone shared a fill-in-the-blank story with you. Tap to play!",
        url: `${origin}${path}`,
        image,
      }),
      { headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  // Match /result/:resultId
  const resultMatch = path.match(/^\/result\/([a-f0-9-]+)$/i);
  if (resultMatch) {
    const resultId = resultMatch[1];
    try {
      const res = await fetch(`${BACKEND_URL}/story/result/${resultId}`);
      if (res.ok) {
        const data = await res.json();
        const result = data.result;
        if (result) {
          const safe = escapeHtml(result.title || "Untitled");
          const snippet = escapeHtml((result.resultText || "").slice(0, 150));
          return new Response(
            buildHtml({
              title: `"${safe}" — a Glad Libs story`,
              description: snippet ? `${snippet}...` : "Check out this hilarious Glad Libs story!",
              url: `${origin}${path}`,
              image,
            }),
            { headers: { "content-type": "text/html; charset=utf-8" } }
          );
        }
      }
    } catch (_) {
      // fall through
    }
    return new Response(
      buildHtml({
        title: "A Glad Libs story",
        description: "Check out this hilarious fill-in-the-blank story!",
        url: `${origin}${path}`,
        image,
      }),
      { headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  // Not a matched path — let Netlify serve normally
  return;
}

export const config = {
  path: ["/start/*", "/result/*"],
};
