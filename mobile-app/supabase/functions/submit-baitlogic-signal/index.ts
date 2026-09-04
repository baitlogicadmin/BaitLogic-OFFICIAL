import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const CORS = {
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-origin": "*",
};

const categories = new Set([
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

const PHOTO_BUCKET = "nature-checks";
const PHOTO_MAX_BYTES = 1_500_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });
}

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyTurnstile(_request: Request, token: unknown) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return false;
  if (typeof token !== "string" || token.length < 10) return false;

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean };
  return result.success === true;
}

function decodePhotoData(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("invalid_photo");
  const mime = match[1];
  const base64 = match[2];
  if (base64.length > Math.ceil(PHOTO_MAX_BYTES * 4 / 3) + 16) throw new Error("photo_too_large");
  let binary = "";
  try {
    binary = atob(base64);
  } catch {
    throw new Error("invalid_photo");
  }
  if (binary.length > PHOTO_MAX_BYTES) throw new Error("photo_too_large");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return { bytes, mime, ext };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_100_000) return json({ error: "payload_too_large" }, 413);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (typeof body.website === "string" && body.website.trim()) return json({ accepted: true });
  if (body.kind !== "field_checks") return json({ error: "invalid_kind" }, 400);
  if (!await verifyTurnstile(request, body.captcha_token)) return json({ error: "captcha_required" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "service_unavailable" }, 503);

  const fingerprint = await sha256(`${serviceKey.slice(-32)}|${clientIp(request)}|${request.headers.get("user-agent") ?? ""}`);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: allowed, error: rateError } = await supabase.rpc("claim_baitlogic_submission_slot", {
    p_fingerprint: fingerprint,
    p_kind: "field_checks",
  });
  if (rateError) return json({ error: "service_unavailable" }, 503);
  if (allowed !== true) return json({ error: "rate_limited" }, 429);

  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  const rows: Array<Record<string, unknown>> = [];
  const photoResults: Array<{ client_id: string; status: "none" | "uploaded" | "failed" }> = [];

  for (const candidate of items) {
    if (!candidate || typeof candidate !== "object") return json({ error: "invalid_field_check" }, 400);
    const item = candidate as Record<string, unknown>;
    const clientId = typeof item.client_id === "string" ? item.client_id.trim() : "";
    const category = typeof item.category === "string" ? item.category : "";
    const note = typeof item.note === "string" ? item.note.trim() : "";
    const place = typeof item.place === "string" ? item.place.trim() : "";
    const displayName = typeof item.display_name === "string" ? item.display_name.trim().slice(0, 60) : "Community member";
    if (!clientId || clientId.length > 120 || !categories.has(category) || note.length < 2 || note.length > 500 || place.length < 2 || place.length > 120) {
      return json({ error: "invalid_field_check" }, 400);
    }

    let photoPath: string | null = null;
    let photoStatus: "none" | "uploaded" | "failed" = "none";
    try {
      const photo = decodePhotoData(item.photo_data);
      if (photo) {
        photoPath = `field-checks/${clientId}.${photo.ext}`;
        const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(photoPath, photo.bytes, {
          contentType: photo.mime,
          cacheControl: "31536000",
          upsert: true,
        });
        if (uploadError) {
          console.error("field_check_photo_upload", uploadError);
          photoPath = null;
          photoStatus = "failed";
        } else {
          photoStatus = "uploaded";
        }
      }
    } catch (photoError) {
      const code = String((photoError as Error)?.message || "invalid_photo");
      if (code === "photo_too_large") return json({ error: "photo_too_large" }, 413);
      return json({ error: "invalid_photo" }, 400);
    }

    rows.push({
      client_id: clientId,
      category,
      note,
      place,
      display_name: displayName || "Community member",
      photo_path: photoPath,
      location_precision: "area_only",
      moderation_status: "pending",
    });
    photoResults.push({ client_id: clientId, status: photoStatus });
  }

  if (!rows.length || rows.length !== items.length) return json({ error: "invalid_field_check" }, 400);

  const { error } = await supabase.from("field_checks").upsert(rows, { onConflict: "client_id" });
  if (error) return json({ error: "could_not_save" }, 500);
  return json({ accepted: true, count: rows.length, photos: photoResults }, 201);
});
