"use strict";

const { nowIso, toText, validEmail, supabaseRequest, commonHeaders, methodNotAllowed } = require("../lib/baitlogic-api");

module.exports = async function handler(req, res) {
  commonHeaders(res, "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const name = toText(req.body?.name, 80);
    const email = toText(req.body?.email, 120).toLowerCase();
    if (!name || !validEmail(email)) return res.status(400).json({ error: "Valid name and email required." });
    await supabaseRequest("signups", {
      method: "POST",
      body: JSON.stringify({ name, email, created_at: nowIso() }),
    });
    return res.status(201).json({ message: "You are on the BaitLogic list." });
  } catch (error) {
    console.error("signups", error);
    return res.status(500).json({ error: "Signup is temporarily unavailable." });
  }
};
