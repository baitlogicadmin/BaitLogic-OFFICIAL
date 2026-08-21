import type { SupabaseClient } from "@supabase/supabase-js";

export type FieldCheckSyncState = "pending" | "submitted" | "approved";

export type FieldCheck = {
  id: string;
  category: string;
  note: string;
  place: string;
  createdAt: string;
  syncState: FieldCheckSyncState;
};

export type SyncMode = "offline" | "device" | "syncing" | "synced";

export type WelcomeEmailState = "sent" | "already_sent" | "not_configured" | "failed" | "queued" | "unknown";

export type WeeklySignup = {
  email: string;
  consentAt: string;
  submitted: boolean;
  website?: string;
  welcomeEmail?: WelcomeEmailState;
};

export type WeeklyEmailSyncResult = {
  status: "none" | "failed" | "synced";
  welcomeEmail: WelcomeEmailState;
};

type FieldCheckRow = {
  client_id: string;
  category: string;
  note: string;
  place: string;
  created_at: string;
};

const FIELD_CHECKS_KEY = "baitlogic-field-checks-v2";
const LEGACY_FIELD_CHECKS_KEY = "baitlogic-field-checks";
const SAVED_KEY = "baitlogic-saved-items-v2";
const WEEKLY_EMAIL_KEY = "baitlogic-weekly-email-v2";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  || "https://gibaaxzltpdizayvicgf.supabase.co";
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || "sb_publishable_oUyldV6BybbdjH3GhVRzqw_uVLKl_xN";

export const backendConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let supabasePromise: Promise<SupabaseClient | null> | null = null;

function getSupabase() {
  if (!backendConfigured) return Promise.resolve(null);
  if (!supabasePromise) {
    supabasePromise = import("@supabase/supabase-js").then(async ({ createClient }) => {
      const client = createClient(
        supabaseUrl,
        supabasePublishableKey,
        { auth: { persistSession: true, autoRefreshToken: true } },
      );
      const { data } = await client.auth.getSession();
      if (data.session) return client;
      const { error } = await client.auth.signInAnonymously();
      if (!error || error.code === "anonymous_provider_disabled") return client;
      return null;
    });
  }
  return supabasePromise;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `field-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function persistFieldChecks(items: FieldCheck[]) {
  localStorage.setItem(FIELD_CHECKS_KEY, JSON.stringify(items.slice(0, 100)));
}

function migrateLegacyFieldChecks(): FieldCheck[] {
  const legacy = readJson<Array<{ id: number; category: string; note: string; place: string }>>(
    LEGACY_FIELD_CHECKS_KEY,
    [],
  );

  const migrated = legacy.map((item) => ({
    id: `legacy-${item.id}`,
    category: item.category,
    note: item.note,
    place: item.place || "Area not shared",
    createdAt: new Date(item.id || Date.now()).toISOString(),
    syncState: "pending" as const,
  }));

  if (migrated.length) persistFieldChecks(migrated);
  return migrated;
}

export function readFieldChecks(): FieldCheck[] {
  const current = readJson<FieldCheck[]>(FIELD_CHECKS_KEY, []);
  return current.length ? current : migrateLegacyFieldChecks();
}

export function addFieldCheck(category: string, note: string, place = "Area not shared") {
  const item: FieldCheck = {
    id: makeId(),
    category,
    note: note.trim(),
    place,
    createdAt: new Date().toISOString(),
    syncState: "pending",
  };
  const next = [item, ...readFieldChecks()];
  persistFieldChecks(next);
  return next;
}

export function readSavedIds() {
  return readJson<number[]>(SAVED_KEY, []);
}

export function persistSavedIds(ids: number[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
}

export function saveWeeklyEmail(email: string, website = "") {
  localStorage.setItem(
    WEEKLY_EMAIL_KEY,
    JSON.stringify({ email: email.trim().toLowerCase(), consentAt: new Date().toISOString(), submitted: false, website }),
  );
}

export function readWeeklySignup() {
  return readJson<WeeklySignup | null>(WEEKLY_EMAIL_KEY, null);
}

async function syncWeeklyEmail(captchaToken?: string): Promise<WeeklyEmailSyncResult> {
  const signup = readWeeklySignup();
  const supabase = await getSupabase();
  if (!signup || signup.submitted) {
    return { status: "none", welcomeEmail: signup?.welcomeEmail ?? "unknown" };
  }
  if (!supabase) return { status: "failed", welcomeEmail: "unknown" };

  const { data, error } = await supabase.functions.invoke("submit-baitlogic-signal", {
    body: {
      kind: "weekly_signup",
      email: signup.email,
      consent_at: signup.consentAt,
      website: signup.website ?? "",
      captcha_token: captchaToken,
    },
  });

  if (error) return { status: "failed", welcomeEmail: "unknown" };
  const allowedWelcomeStates = new Set<WelcomeEmailState>(["sent", "already_sent", "not_configured", "failed", "queued", "unknown"]);
  const responseWelcome = data && typeof data === "object" && "welcome" in data && typeof data.welcome === "string"
    ? data.welcome
    : "unknown";
  const welcomeEmail: WelcomeEmailState = allowedWelcomeStates.has(responseWelcome as WelcomeEmailState)
    ? responseWelcome as WelcomeEmailState
    : "unknown";
  localStorage.setItem(WEEKLY_EMAIL_KEY, JSON.stringify({ ...signup, submitted: true, welcomeEmail }));
  return { status: "synced", welcomeEmail };
}

async function submitPendingFieldChecks(items: FieldCheck[], captchaToken?: string) {
  const supabase = await getSupabase();
  if (!supabase) return { items, ok: false };

  const next = [...items];
  const pending = next.filter((item) => item.syncState === "pending").slice(0, 20);
  if (!pending.length) return { items: next, ok: true };

  const { error } = await supabase.functions.invoke("submit-baitlogic-signal", {
    body: {
      kind: "field_checks",
      captcha_token: captchaToken,
      items: pending.map((item) => ({
        client_id: item.id,
        category: item.category,
        note: item.note,
        place: item.place,
      })),
    },
  });

  if (error) return { items: next, ok: false };

  const submittedIds = new Set(pending.map((item) => item.id));
  for (let index = 0; index < next.length; index += 1) {
    if (submittedIds.has(next[index].id)) next[index] = { ...next[index], syncState: "submitted" };
  }

  persistFieldChecks(next);
  return { items: next, ok: true };
}

async function readApprovedFieldChecks() {
  const supabase = await getSupabase();
  if (!supabase) return { items: [] as FieldCheck[], ok: false };
  const { data, error } = await supabase
    .from("field_checks")
    .select("client_id,category,note,place,created_at")
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) return { items: [] as FieldCheck[], ok: false };
  const items = (data as FieldCheckRow[]).map((row) => ({
    id: row.client_id,
    category: row.category,
    note: row.note,
    place: row.place,
    createdAt: row.created_at,
    syncState: "approved" as const,
  }));
  return { items, ok: true };
}

export async function syncBaitLogicData(
  online: boolean,
  captchaTokens: { field?: string; email?: string } = {},
) {
  const local = readFieldChecks();
  if (!online || !backendConfigured) {
    return {
      fieldChecks: local,
      mode: online ? ("device" as const) : ("offline" as const),
      emailSynced: false,
      emailStatus: { status: "none" as const, welcomeEmail: "unknown" as const },
    };
  }

  const [submission, remote, emailStatus] = await Promise.all([
    submitPendingFieldChecks(local, captchaTokens.field),
    readApprovedFieldChecks(),
    syncWeeklyEmail(captchaTokens.email),
  ]);
  const merged = new Map<string, FieldCheck>();
  remote.items.forEach((item) => merged.set(item.id, item));
  submission.items.forEach((item) => merged.set(item.id, item));
  const fieldChecks = Array.from(merged.values()).sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
  persistFieldChecks(fieldChecks);

  return {
    fieldChecks,
    mode: submission.ok && remote.ok ? ("synced" as const) : ("device" as const),
    emailSynced: emailStatus.status === "synced",
    emailStatus,
  };
}

export function relativeTime(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}
