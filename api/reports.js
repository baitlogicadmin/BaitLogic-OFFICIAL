"use strict";

const { randomUUID } = require("crypto");
const { toText, supabaseRequest, commonHeaders, methodNotAllowed } = require("../lib/baitlogic-api");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://gibaaxzltpdizayvicgf.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_oUyldV6BybbdjH3GhVRzqw_uVLKl_xN";
const PHOTO_BUCKET = "nature-checks";
const FIELD_CATEGORIES = new Set([
  "Water",
  "Wildlife",
  "Habitat",
  "Access",
  "Fishing",
  "Something Cool",
  "Something Strange",
  "Trail",
  "Weather",
  "Conservation",
]);

function publicPhotoUrl(path) {
  if (!path) return null;
  const encodedPath = String(path).split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${encodedPath}`;
}

async function submitFieldCheck(item) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-baitlogic-signal`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      "x-baitlogic-web-bridge": "legacy-public-form",
    },
    body: JSON.stringify({ kind: "field_checks", items: [item] }),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const code = data?.error || `submission_failed_${response.status}`;
    throw new Error(code);
  }
  return data;
}

module.exports = async function handler(req, res) {
  commonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const rows = await supabaseRequest("field_checks?select=client_id,category,note,place,display_name,photo_path,created_at&moderation_status=eq.approved&order=created_at.desc&limit=50");
      const reports = (rows || []).map(row => ({
        id: row.client_id,
        category: row.category,
        name: row.display_name || "Community member",
        water: row.place,
        report: row.note,
        photo_url: publicPhotoUrl(row.photo_path),
        gps: null,
        created_at: row.created_at,
      }));
      return res.status(200).json({ reports, moderation: "approved_only" });
    }

    if (req.method === "POST") {
      const category = toText(req.body?.category, 50);
      const name = toText(req.body?.name, 60) || "Community member";
      const water = toText(req.body?.water, 120);
      const report = toText(req.body?.report, 500);
      const photoData = typeof req.body?.photo_data === "string" ? req.body.photo_data : "";

      if (!FIELD_CATEGORIES.has(category)) return res.status(400).json({ error: "Choose a valid Field Check category." });
      if (!water || !report) return res.status(400).json({ error: "Area and observation are required." });
      if (photoData.length > 2_050_000) return res.status(413).json({ error: "Photo is too large. Choose a smaller image and try again." });

      const clientId = `web-${randomUUID()}`;
      const result = await submitFieldCheck({
        client_id: clientId,
        category,
        note: report,
        place: water,
        display_name: name,
        photo_data: photoData || undefined,
      });
      const photoUpload = result?.photos?.find?.(item => item.client_id === clientId)?.status || "none";

      return res.status(202).json({
        message: photoUpload === "failed"
          ? "Field Check saved, but the photo could not upload. Your observation was not lost."
          : "Field Check submitted for review.",
        moderation: "pending_review",
        photo_upload: photoUpload,
        report: {
          id: clientId,
          category,
          name,
          water,
          report,
          gps: null,
        },
      });
    }

    return methodNotAllowed(res);
  } catch (error) {
    console.error("reports", error);
    const message = String(error?.message || "");
    if (message === "rate_limited") return res.status(429).json({ error: "Too many Field Checks were submitted from this connection. Try again later." });
    if (message === "captcha_required") return res.status(403).json({ error: "Submission verification is required." });
    if (message === "photo_too_large") return res.status(413).json({ error: "Photo is too large. Choose a smaller image and try again." });
    if (message === "invalid_photo") return res.status(400).json({ error: "That photo format could not be used. Choose a JPG, PNG or WebP image." });
    return res.status(500).json({ error: "Field Checks are temporarily unavailable." });
  }
};
