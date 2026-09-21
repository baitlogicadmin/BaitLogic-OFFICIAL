"use strict";

const { supabaseRequest, commonHeaders, methodNotAllowed } = require("../lib/baitlogic-api");

module.exports = async function handler(req, res) {
  commonHeaders(res, "GET, OPTIONS");
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

    return methodNotAllowed(res);
  } catch (error) {
    console.error("catches", error);
    return res.status(500).json({ error: "Catch logging is temporarily unavailable." });
  }
};
