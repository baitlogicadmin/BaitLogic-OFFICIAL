"use strict";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });

  return res.status(200).json({
    ok: true,
    source: "github",
    productionTarget: "vercel",
    git: {
      sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      ref: process.env.VERCEL_GIT_COMMIT_REF || null,
      repo: process.env.VERCEL_GIT_REPO_SLUG || "BaitLogic-OFFICIAL",
      owner: process.env.VERCEL_GIT_REPO_OWNER || "baitlogicadmin",
    },
    deployment: {
      environment: process.env.VERCEL_ENV || null,
      url: process.env.VERCEL_URL || null,
    },
    runtime: {
      node: process.version,
    },
  });
};
