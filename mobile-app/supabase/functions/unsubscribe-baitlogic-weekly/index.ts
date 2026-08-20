import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

async function signEmail(email: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "GET" && request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const url = new URL(request.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("token") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey || !email || !safeEqual(token, await signEmail(email, serviceKey))) return new Response("Invalid unsubscribe link", { status: 400 });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from("weekly_signups").update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }).eq("email", email);
  if (error) return new Response("Please try again later", { status: 503 });

  return new Response("<!doctype html><html><head><meta name=viewport content='width=device-width'><title>Unsubscribed · BaitLogic Outdoors</title></head><body style='font-family:Arial,sans-serif;background:#061535;color:#fff;display:grid;min-height:100vh;place-items:center;margin:0'><main style='max-width:460px;padding:32px;text-align:center'><h1 style='color:#f1bd32'>You’re unsubscribed.</h1><p>You will no longer receive the BaitLogic weekly local picture.</p></main></body></html>", { headers: { "content-type": "text/html; charset=utf-8" } });
});
