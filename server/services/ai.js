const Anthropic = require("@anthropic-ai/sdk").default;

const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

async function generateImagePrompt(title, resultText) {
  const client = getClient();
  if (!client) return null;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system:
      "You write vivid, detailed image generation prompts. Given a completed Mad Libs story, write a 1-2 sentence prompt describing the single funniest/most absurd visual scene from the story. Use a whimsical children's book illustration style. Keep it suitable for all ages. Output ONLY the prompt, nothing else.",
    messages: [
      {
        role: "user",
        content: `Story title: "${title}"\n\nCompleted story:\n${resultText}`,
      },
    ],
  });

  const text = response.content?.[0]?.text;
  return text || null;
}

async function generateIllustration(title, resultText) {
  const client = getClient();
  if (!client) return null;

  const imagePrompt = await generateImagePrompt(title, resultText);
  if (!imagePrompt) return null;

  try {
    const response = await client.images.generate({
      model: "claude-image-gen-1",
      prompt: imagePrompt,
      size: "1024x1024",
    });

    const imageData = response.data?.[0];
    if (imageData?.url) return imageData.url;
    if (imageData?.b64_json) {
      return `data:image/png;base64,${imageData.b64_json}`;
    }
    return null;
  } catch (err) {
    console.error("Image generation failed, trying DALL-E fallback:", err.message);
    return tryDalleFallback(imagePrompt);
  }
}

async function tryDalleFallback(imagePrompt) {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    const data = await response.json();
    return data.data?.[0]?.url || null;
  } catch (err) {
    console.error("DALL-E fallback failed:", err.message);
    return null;
  }
}

module.exports = { generateIllustration };
