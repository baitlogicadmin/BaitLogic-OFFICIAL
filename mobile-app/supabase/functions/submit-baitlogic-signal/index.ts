import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const CORS = {
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-baitlogic-web-bridge",
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
const ADMIN_EMAIL = "baitlogicadmin@gmail.com";

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

async function verifyTurnstile(request: Request, token: unknown) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true;
  if (typeof token !== "string" || token.length < 10) return false;

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  form.append("remoteip", clientIp(request));
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
  try { binary = atob(base64); } catch { throw new Error("invalid_photo"); }
  if (binary.length > PHOTO_MAX_BYTES) throw new Error("photo_too_large");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return { bytes, mime, ext };
}

async function sendResendEmail(apiKey: string, payload: Record<string, unknown>) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const providerText = await response.text();
  let providerId: string | null = null;
  try {
    const parsed = providerText ? JSON.parse(providerText) as { id?: string } : null;
    providerId = typeof parsed?.id === "string" ? parsed.id : null;
  } catch {}
  return { ok: response.ok, status: response.status, providerText, providerId };
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

  const requestedKind = body.kind === "weekly_signup" ? "weekly_signup" : body.kind === "field_checks" ? "field_checks" : null;
  const trustedWebBridge = requestedKind !== null && request.headers.get("x-baitlogic-web-bridge") === "legacy-public-form";
  if (!trustedWebBridge && !await verifyTurnstile(request, body.captcha_token)) {
    return json({ error: "captcha_required" }, 403);
  }
  const kind = requestedKind;
  if (!kind) return json({ error: "invalid_kind" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "service_unavailable" }, 503);

  const fingerprint = await sha256(`${serviceKey.slice(-32)}|${clientIp(request)}|${request.headers.get("user-agent") ?? ""}`);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: allowed, error: rateError } = await supabase.rpc("claim_baitlogic_submission_slot", {
    p_fingerprint: fingerprint,
    p_kind: kind,
  });
  if (rateError) return json({ error: "service_unavailable" }, 503);
  if (allowed !== true) return json({ error: "rate_limited" }, 429);

  if (kind === "weekly_signup") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const consentAt = typeof body.consent_at === "string" ? body.consent_at : new Date().toISOString();
    const source = typeof body.source === "string" && body.source.trim() ? body.source.trim().slice(0, 40) : "baitlogic_app";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) || email.length > 254) return json({ error: "invalid_email" }, 400);

    const signupRecord: Record<string, unknown> = {
      email,
      source,
      consent_at: consentAt,
      status: "subscribed",
      unsubscribed_at: null,
    };
    if (name) signupRecord.name = name;

    const { error } = await supabase.from("weekly_signups").upsert(signupRecord, { onConflict: "email" });
    if (error) {
      console.error("weekly_signup_save", error);
      return json({ error: "could_not_save" }, 500);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("BAITLOGIC_EMAIL_FROM");
    let welcome: "sent" | "failed" | "unavailable" = "unavailable";
    let adminNotification: "sent" | "failed" | "unavailable" = "unavailable";

    if (resendKey && emailFrom) {
      try {
        const welcomeResult = await sendResendEmail(resendKey, {
          from: emailFrom,
          to: [email],
          subject: "Welcome to the BaitLogic weekly local picture",
          html: "<div style=\"font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#061535\"><h1 style=\"color:#b78300\">You’re on the list.</h1><p>Each week, BaitLogic Outdoors will send one useful local picture covering weather, water, wildlife, trails, conservation, and the local changes worth knowing.</p><p>No paywall. No filler. Exact community locations are never included.</p></div>",
        });

        if (welcomeResult.ok) {
          welcome = "sent";
          await supabase.from("weekly_signups").update({
            welcome_sent_at: new Date().toISOString(),
            welcome_message_id: welcomeResult.providerId,
            welcome_error: null,
          }).eq("email", email);
        } else {
          welcome = "failed";
          await supabase.from("weekly_signups").update({
            welcome_error: `resend_${welcomeResult.status}:${welcomeResult.providerText.slice(0, 500)}`,
          }).eq("email", email);
        }
      } catch (mailError) {
        welcome = "failed";
        await supabase.from("weekly_signups").update({
          welcome_error: `resend_exception:${String(mailError).slice(0, 500)}`,
        }).eq("email", email);
      }

      try {
        const adminResult = await sendResendEmail(resendKey, {
          from: emailFrom,
          to: [ADMIN_EMAIL],
          reply_to: email,
          subject: "New BaitLogic email signup",
          text: `A new BaitLogic subscriber joined.\n\nName: ${name || "Not provided"}\nEmail: ${email}\nSource: ${source}\nTime: ${consentAt}`,
        });

        if (adminResult.ok) {
          adminNotification = "sent";
          await supabase.from("weekly_signups").update({
            admin_notified_at: new Date().toISOString(),
            admin_message_id: adminResult.providerId,
            admin_error: null,
          }).eq("email", email);
        } else {
          adminNotification = "failed";
          await supabase.from("weekly_signups").update({
            admin_error: `resend_${adminResult.status}:${adminResult.providerText.slice(0, 500)}`,
          }).eq("email", email);
        }
      } catch (adminError) {
        adminNotification = "failed";
        await supabase.from("weekly_signups").update({
          admin_error: `resend_exception:${String(adminError).slice(0, 500)}`,
        }).eq("email", email);
      }
    } else {
      await supabase.from("weekly_signups").update({
        welcome_error: "email_not_configured",
        admin_error: "email_not_configured",
      }).eq("email", email);
    }

    return json({ accepted: true, welcome, admin_notification: adminNotification }, 201);
  }

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
