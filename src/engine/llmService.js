const { GoogleGenAI } = require("@google/genai");
const rateLimiter = require("./rateLimiter");

let ai = null;

function getClient() {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

/**
 * Generate a JSON response from Gemini
 */
async function generateResponse(systemInstruction, prompt) {
  const client = getClient();
  
  if (!client) {
    console.warn("LLM Service: No GEMINI_API_KEY found in .env, falling back...");
    return null;
  }

  const maxRetries = 3;
  let delayMs = 15000; // Start with a longer delay when rate limited

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Token-bucket limiter: allows bounded concurrency up to the provider
      // quota instead of a single process-wide 4s gate.
      await rateLimiter.take();

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });

      const text = response.text;
      console.log("🤖 Response by LLM successfully generated!");
      return JSON.parse(text);

    } catch (error) {
      const isRateLimit = error.status === 429 || error.status === 503 || (error.message && error.message.toLowerCase().includes("quota"));
      
      if (isRateLimit && attempt < maxRetries) {
        console.warn(`LLM API Rate Limit/503. Retrying attempt ${attempt}/${maxRetries} in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      } else {
        console.error(`LLM Generation Error (Attempt ${attempt}):`, error.message);
        return null;
      }
    }
  }
}

module.exports = {
  generateResponse
};
