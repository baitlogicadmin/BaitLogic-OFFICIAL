"use strict";

const { nowIso, toText, supabaseRequest, commonHeaders, methodNotAllowed } = require("../lib/baitlogic-api");

module.exports = async function handler(req, res) {
  commonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const rows = await supabaseRequest("field_checks?select=client_id,category,note,place,created_at&moderation_status=eq.approved&order=created_at.desc&limit=50");
      const reports = (rows || []).map(row => ({
        id: row.client_id,
        category: row.category,
        name: "Community member",
        water: row.place,
        report: row.note,
        gps: null,
        created_at: row.created_at,
      }));
      return res.status(200).json({ reports, moderation: "approved_only" });
    }

    if (req.method === "POST") {
      const category = toText(req.body?.category, 50) || "Community";
      const name = toText(req.body?.name, 60);
      const water = toText(req.body?.water, 80);
      const report = toText(req.body?.report, 400);
      const gps = toText(req.body?.gps, 100);
      if (!name || !water || !report) return res.status(400).json({ error: "Name, area, and observation are required." });
      const rows = await supabaseRequest("reports", {
        method: "POST",
        body: JSON.stringify({ category, name, water, report, gps: gps || null, created_at: nowIso() }),
      });
      return res.status(202).json({
        message: "Field Check submitted for review.",
        moderation: "pending_review",
        report: rows?.[0] || null,
      });
    }

    return methodNotAllowed(res);
  } catch (error) {
    console.error("reports", error);
    return res.status(500).json({ error: "Field Checks are temporarily unavailable." });
  }
};
