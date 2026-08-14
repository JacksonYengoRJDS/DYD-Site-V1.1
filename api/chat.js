// POST /api/chat
// Receives the visitor's conversation from the widget, calls Groq,
// and returns the reply. The Groq API key lives only here, as a
// server-side environment variable — it is never sent to the browser.
//
// Groq's API is OpenAI-compatible, so the widget's message format
// (role: "user" | "assistant", content: string) is sent through
// almost unchanged — no reshaping needed like Gemini required.

const { SYSTEM_PROMPT } = require("./system-prompt");

// Llama 3.1 8B is Groq's smallest/fastest model — plenty for answering
// questions from a fixed knowledge base like this one, and the cheapest
// option if you ever move past the free tier.
//
// Free tier: no credit card required. Rate limits (roughly 30 requests/
// minute, per Groq's published limits as of mid-2026) apply per model,
// at the organization level. Check current numbers in your dashboard at
// console.groq.com if replies start getting rejected — Groq adjusts
// these periodically.
const MODEL = "llama-3.1-8b-instant";
const MAX_OUTPUT_TOKENS = 400;

// Basic abuse guards. These are intentionally simple — see README-deploy.md
// for how to add real IP-based rate limiting (Vercel Firewall / Upstash)
// once you have traffic worth protecting against.
const MAX_MESSAGES_PER_REQUEST = 20; // caps conversation length sent per call
const MAX_MESSAGE_LENGTH = 2000; // characters per single message

module.exports = async function handler(req, res) {
  // CORS: allow the widget to call this from your site. Tighten
  // ALLOWED_ORIGIN in your Vercel environment variables once you
  // know your final domain, instead of leaving this open.
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.GROQ_API_KEY) {
    res.status(500).json({ error: "Server is not configured (missing API key)." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    let messages = Array.isArray(body?.messages) ? body.messages : null;

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: "Missing conversation messages." });
      return;
    }

    // --- Validate & sanitize input before it ever reaches the API ---
    if (messages.length > MAX_MESSAGES_PER_REQUEST) {
      messages = messages.slice(-MAX_MESSAGES_PER_REQUEST);
    }

    for (const m of messages) {
      if (
        !m ||
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.content !== "string"
      ) {
        res.status(400).json({ error: "Invalid message format." });
        return;
      }
      if (m.content.length > MAX_MESSAGE_LENGTH) {
        m.content = m.content.slice(0, MAX_MESSAGE_LENGTH);
      }
    }

    // OpenAI-compatible chat format: system prompt is just the first
    // message in the array, with role "system".
    const groqMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: MODEL,
        messages: groqMessages,
        max_tokens: MAX_OUTPUT_TOKENS
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      res.status(502).json({ error: "The assistant is temporarily unavailable. Please try again shortly." });
      return;
    }

    const data = await groqRes.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      "Sorry, I wasn't able to generate a response. Please try again.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat handler error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
