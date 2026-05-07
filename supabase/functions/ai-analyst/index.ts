import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are SentinelIQ AI, an expert Tier-3 SOC analyst. Analyze the security alert and respond ONLY with valid JSON, no markdown, no extra text:
{"verdict":"TRUE_POSITIVE|FALSE_POSITIVE|BENIGN","confidence":0-100,"severity":"CRITICAL|HIGH|MEDIUM|LOW","summary":"2-3 sentence plain language summary","ioc_assessment":"IOC analysis","mitre_tactic":"tactic name","mitre_technique":"T-ID technique name","root_cause":"1-2 sentence root cause","recommended_actions":["action1","action2","action3","action4"],"priority_score":1-10,"escalate":true|false}`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { alert } = await req.json();

    if (!alert) {
      return new Response(JSON.stringify({ error: "Missing alert data" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const message = `Alert: ${alert.id} | ${alert.severity} | ${alert.title}
Source: ${alert.source} | Asset: ${alert.asset} | IP: ${alert.ip}
Tactic: ${alert.tactic} | Status: ${alert.status}
Description: ${alert.description}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return new Response(JSON.stringify({ error: err.error?.message || "Anthropic API error" }), {
        status: res.status,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text || "";

    // Parse the JSON from Claude's response
    let parsed = null;
    try {
      const start = raw.indexOf("{");
      const end   = raw.lastIndexOf("}");
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, analysis: parsed }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
