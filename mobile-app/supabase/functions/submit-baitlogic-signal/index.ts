import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const CORS = {
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-origin": "*",
};

const categories = new Set(["Water", "Wildlife", "Trail", "Weather", "Conservation"]);

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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 20_000) return json({ error: "payload_too_large" }, 413);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Hidden-field bot trap: accept silently so automated fillers do not retry.
  if (typeof body.website === "string" && body.website.trim()) return json({ accepted: true });
  if (!await verifyTurnstile(request, body.captcha_token)) return json({ error: "captcha_required" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "service_unavailable" }, 503);

  const kind = body.kind === "weekly_signup" ? "weekly_signup" : body.kind === "field_checks" ? "field_checks" : null;
  if (!kind) return json({ error: "invalid_kind" }, 400);

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
    const consentAt = typeof body.consent_at === "string" ? body.consent_at : new Date().toISOString();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) || email.length > 254) return json({ error: "invalid_email" }, 400);

    const { data: signup, error } = await supabase.from("weekly_signups").upsert({
      email,
      source: "baitlogic_app",
      consent_at: consentAt,
      status: "subscribed",
      unsubscribed_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" }).select("welcome_status").single();
    if (error) return json({ error: "could_not_save" }, 500);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("BAITLOGIC_EMAIL_FROM");
    let welcome = signup?.welcome_status === "sent" ? "already_sent" : "not_configured";
    if (welcome !== "already_sent" && resendKey && emailFrom) {
      const attemptedAt = new Date().toISOString();
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: emailFrom,
          to: [email],
          subject: "Welcome to the BaitLogic weekly local picture",
          html: "<div style=\"font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#061535\"><h1 style=\"color:#b78300\">You’re on the list.</h1><p>Each week, BaitLogic Outdoors will send one useful local picture covering weather, water, wildlife, trails, and one good way to help.</p><p>Exact community locations are never included.</p></div>",
        }),
      });
      welcome = response.ok ? "sent" : "failed";
      await supabase.from("weekly_signups").update({
        welcome_status: welcome,
        welcome_sent_at: response.ok ? attemptedAt : null,
        last_delivery_attempt_at: attemptedAt,
        last_delivery_error: response.ok ? null : `resend_http_${response.status}`,
        updated_at: attemptedAt,
      }).eq("email", email);
    } else if (welcome === "not_configured") {
      await supabase.from("weekly_signups").update({
        welcome_status: "not_configured",
        last_delivery_error: "email_provider_not_configured",
        updated_at: new Date().toISOString(),
      }).eq("email", email);
    }
    return json({ accepted: true, welcome }, 201);
  }

  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  const rows = items.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Record<string, unknown>;
    const clientId = typeof item.client_id === "string" ? item.client_id.trim() : "";
    const category = typeof item.category === "string" ? item.category : "";
    const note = typeof item.note === "string" ? item.note.trim() : "";
    const place = typeof item.place === "string" ? item.place.trim() : "";
    if (!clientId || clientId.length > 120 || !categories.has(category) || note.length < 2 || note.length > 500 || place.length < 2 || place.length > 120) return [];
    return [{ client_id: clientId, category, note, place, location_precision: "area_only", moderation_status: "pending" }];
  });
  if (!rows.length || rows.length !== items.length) return json({ error: "invalid_field_check" }, 400);

  const { error } = await supabase.from("field_checks").upsert(rows, { onConflict: "client_id", ignoreDuplicates: true });
  if (error) return json({ error: "could_not_save" }, 500);
  return json({ accepted: true, count: rows.length }, 201);
});
