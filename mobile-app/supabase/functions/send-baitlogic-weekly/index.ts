import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

async function signEmail(email: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("BAITLOGIC_EMAIL_FROM");
  const publicSite = Deno.env.get("BAITLOGIC_PUBLIC_SITE") ?? "https://baitlogic-app-preview.baitlogic.chatgpt.site";
  if (!supabaseUrl || !serviceKey || !resendKey || !emailFrom) return json({ error: "email_provider_not_configured" }, 503);

  if (request.headers.get("authorization") !== `Bearer ${serviceKey}`) return json({ error: "forbidden" }, 403);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const cutoff = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: signups, error: signupError }, { data: notes, error: notesError }] = await Promise.all([
    supabase.from("weekly_signups").select("email").eq("status", "subscribed").or(`last_sent_at.is.null,last_sent_at.lt.${cutoff}`).limit(100),
    supabase.from("field_checks").select("category,note,place,created_at").eq("moderation_status", "approved").order("created_at", { ascending: false }).limit(5),
  ]);
  if (signupError || notesError) return json({ error: "data_unavailable" }, 503);

  const noteItems = (notes ?? []).map((note) => `<li style="margin:0 0 12px"><strong>${escapeHtml(note.category)}</strong> — ${escapeHtml(note.note)}<br><span style="color:#667085">${escapeHtml(note.place)}</span></li>`).join("");
  const localPicture = noteItems || "<li>No approved community notes this week. Your exact spots remain private when new Field Checks arrive.</li>";
  let sent = 0;
  let failed = 0;

  for (const signup of signups ?? []) {
    const token = await signEmail(signup.email, serviceKey);
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-baitlogic-weekly?email=${encodeURIComponent(signup.email)}&token=${token}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: emailFrom,
        to: [signup.email],
        subject: "The BaitLogic weekly local picture",
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#061535"><p style="color:#b78300;font-weight:700;letter-spacing:.08em">BAITLOGIC OUTDOORS</p><h1>Your weekly local picture</h1><p>Weather, water, wildlife, trails, and conservation—kept useful and local.</p><ul style="padding-left:20px">${localPicture}</ul><p><a href="${publicSite}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#061535;color:#fff;text-decoration:none">Open BaitLogic</a></p><p style="font-size:12px;color:#667085">Exact locations are never included. <a href="${unsubscribeUrl}">Unsubscribe</a></p></div>`,
      }),
    });
    if (!response.ok) { failed += 1; continue; }
    sent += 1;
    await supabase.from("weekly_signups").update({ last_sent_at: new Date().toISOString() }).eq("email", signup.email);
  }

  return json({ sent, failed, eligible: signups?.length ?? 0 });
});
