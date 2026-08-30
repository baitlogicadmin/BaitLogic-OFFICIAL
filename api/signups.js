"use strict";

const { nowIso, toText, validEmail, commonHeaders, methodNotAllowed } = require("../lib/baitlogic-api");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://gibaaxzltpdizayvicgf.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_oUyldV6BybbdjH3GhVRzqw_uVLKl_xN";

async function submitWeeklySignup({ name, email, captchaToken }) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-baitlogic-signal`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: "weekly_signup",
      name,
      email,
      source: "website",
      consent_at: nowIso(),
      captcha_token: captchaToken,
    }),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(data?.error || `signup_failed_${response.status}`);
  return data || {};
}

module.exports = async function handler(req, res) {
  commonHeaders(res, "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const name = toText(req.body?.name, 80);
    const email = toText(req.body?.email, 120).toLowerCase();
    const captchaToken = toText(req.body?.captcha_token, 4096);
    if (!validEmail(email)) return res.status(400).json({ error: "Valid email required." });
    if (!captchaToken) return res.status(403).json({ error: "Complete the security check and try again." });

    const result = await submitWeeklySignup({ name, email, captchaToken });
    const welcome = result.welcome || "unavailable";
    const message = welcome === "sent"
      ? "You’re on the BaitLogic list. Welcome email sent."
      : "You’re on the BaitLogic list. Email delivery is delayed.";

    return res.status(201).json({ message, welcome });
  } catch (error) {
    console.error("signups", error);
    const message = String(error?.message || "");
    if (message === "rate_limited") return res.status(429).json({ error: "Too many signup attempts. Try again later." });
    if (message === "captcha_required") return res.status(403).json({ error: "Complete the security check and try again." });
    return res.status(500).json({ error: "Signup is temporarily unavailable." });
  }
};
