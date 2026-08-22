"use strict";

const { toText, supabaseRequest, commonHeaders, methodNotAllowed } = require("../lib/baitlogic-api");

module.exports = async function handler(req, res) {
  commonHeaders(res, "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const eventName = toText(req.body?.event_name, 60);
    const eventPath = toText(req.body?.path, 200);
    const sessionId = toText(req.body?.session_id, 80);
    const referrer = toText(req.body?.referrer, 300);
    if (!eventName) return res.status(400).json({ error: "Event name required." });
    await supabaseRequest("analytics_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        event_name: eventName,
        path: eventPath || null,
        session_id: sessionId || null,
        referrer: referrer || null,
      }),
    });
    return res.status(204).end();
  } catch (error) {
    console.error("events", error);
    return res.status(204).end();
  }
};
