"use strict";

const { nowIso, toText, supabaseRequest, commonHeaders, methodNotAllowed } = require("../lib/baitlogic-api");

module.exports = async function handler(req, res) {
  commonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const rows = await supabaseRequest("public_catches?select=id,species,weight_lb,location,notes,created_at&order=created_at.desc&limit=50");
      return res.status(200).json({
        catches: (rows || []).map(row => ({
          id: row.id,
          species: row.species,
          weight: row.weight_lb == null ? null : Number(row.weight_lb),
          location: row.location || "",
          notes: row.notes || "",
          createdAt: row.created_at,
        })),
      });
    }

    if (req.method === "POST") {
      const species = toText(req.body?.species, 80);
      const location = toText(req.body?.location, 120);
      const notes = toText(req.body?.notes, 500);
      const rawWeight = req.body?.weight;
      const weight = rawWeight === "" || rawWeight == null ? null : Number(rawWeight);
      if (!species) return res.status(400).json({ error: "Species is required." });
      if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 500)) {
        return res.status(400).json({ error: "Weight must be between 0 and 500 pounds." });
      }
      const rows = await supabaseRequest("public_catches", {
        method: "POST",
        body: JSON.stringify({
          species,
          weight_lb: weight === null ? null : Number(weight.toFixed(2)),
          location: location || null,
          notes: notes || null,
          created_at: nowIso(),
        }),
      });
      return res.status(201).json({ message: "Catch saved.", catch: rows?.[0] || null });
    }

    return methodNotAllowed(res);
  } catch (error) {
    console.error("catches", error);
    return res.status(500).json({ error: "Catch logging is temporarily unavailable." });
  }
};
