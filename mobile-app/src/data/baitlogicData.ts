import type { SupabaseClient } from "@supabase/supabase-js";

export type FieldCheckSyncState = "pending" | "submitted" | "approved";

export type FieldCheck = {
  id: string;
  category: string;
  note: string;
  place: string;
  createdAt: string;
  syncState: FieldCheckSyncState;
  hasPhoto?: boolean;
};

export type SyncMode = "offline" | "device" | "syncing" | "synced";

type FieldCheckRow = {
  client_id: string;
  category: string;
  note: string;
  place: string;
  created_at: string;
  photo_path: string | null;
};

const FIELD_CHECKS_KEY = "baitlogic-field-checks-v2";
const LEGACY_FIELD_CHECKS_KEY = "baitlogic-field-checks";
const SAVED_KEY = "baitlogic-saved-items-v2";
const WEEKLY_EMAIL_KEY = "baitlogic-weekly-email-v2";
const PHOTO_DB_NAME = "baitlogic-field-photos";
const PHOTO_STORE_NAME = "queued-photos";

function openPhotoDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("Photo storage is unavailable on this device."));
      return;
    }
    const request = indexedDB.open(PHOTO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        request.result.createObjectStore(PHOTO_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Photo storage could not be opened."));
  });
}

async function writeFieldCheckPhoto(id: string, dataUrl: string) {
  const db = await openPhotoDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE_NAME, "readwrite");
    transaction.objectStore(PHOTO_STORE_NAME).put(dataUrl, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Photo could not be stored."));
  });
  db.close();
}

async function readFieldCheckPhoto(id: string) {
  const db = await openPhotoDb();
  const photo = await new Promise<string | undefined>((resolve, reject) => {
    const request = db.transaction(PHOTO_STORE_NAME, "readonly").objectStore(PHOTO_STORE_NAME).get(id);
    request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : undefined);
    request.onerror = () => reject(request.error ?? new Error("Photo could not be read."));
  });
  db.close();
  return photo;
}

async function deleteFieldCheckPhoto(id: string) {
  const db = await openPhotoDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE_NAME, "readwrite");
    transaction.objectStore(PHOTO_STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Photo could not be cleared."));
  });
  db.close();
}

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

export async function addFieldCheck(category: string, note: string, place = "Area not shared", photoData?: string) {
  const item: FieldCheck = {
    id: makeId(),
    category,
    note: note.trim(),
    place,
    createdAt: new Date().toISOString(),
    syncState: "pending",
    hasPhoto: Boolean(photoData),
  };
  if (photoData) await writeFieldCheckPhoto(item.id, photoData);
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

async function syncWeeklyEmail(captchaToken?: string) {
  const signup = readJson<{ email: string; consentAt: string; submitted: boolean; website?: string } | null>(WEEKLY_EMAIL_KEY, null);
  const supabase = await getSupabase();
  if (!signup || signup.submitted) return "none" as const;
  if (!supabase) return "failed" as const;

  const { error } = await supabase.functions.invoke("submit-baitlogic-signal", {
    body: {
      kind: "weekly_signup",
      email: signup.email,
      consent_at: signup.consentAt,
      website: signup.website ?? "",
      captcha_token: captchaToken,
    },
  });

  if (error) return "failed" as const;
  localStorage.setItem(WEEKLY_EMAIL_KEY, JSON.stringify({ ...signup, submitted: true }));
  return "synced" as const;
}

async function submitPendingFieldChecks(items: FieldCheck[], captchaToken?: string) {
  const supabase = await getSupabase();
  if (!supabase) return { items, ok: false };

  const next = [...items];
  const pending = next.filter((item) => item.syncState === "pending").slice(0, 20);
  if (!pending.length) return { items: next, ok: true };

  const payloadItems = await Promise.all(pending.map(async (item) => ({
    client_id: item.id,
    category: item.category,
    note: item.note,
    place: item.place,
    photo_data: item.hasPhoto ? await readFieldCheckPhoto(item.id) : undefined,
  })));

  const { data: response, error } = await supabase.functions.invoke("submit-baitlogic-signal", {
    body: {
      kind: "field_checks",
      captcha_token: captchaToken,
      items: payloadItems,
    },
  });

  if (error) return { items: next, ok: false };

  const photoStatuses = new Map<string, string>(
    Array.isArray(response?.photos)
      ? response.photos.map((result: { client_id?: string; status?: string }) => [result.client_id ?? "", result.status ?? "failed"])
      : [],
  );
  const submittedIds = new Set(pending.map((item) => item.id));
  let allSubmitted = true;
  for (let index = 0; index < next.length; index += 1) {
    if (!submittedIds.has(next[index].id)) continue;
    const photoStatus = next[index].hasPhoto ? photoStatuses.get(next[index].id) : "none";
    if (next[index].hasPhoto && photoStatus !== "uploaded") {
      allSubmitted = false;
      continue;
    }
    next[index] = { ...next[index], syncState: "submitted" };
    if (photoStatus === "uploaded") {
      try { await deleteFieldCheckPhoto(next[index].id); } catch {}
    }
  }

  persistFieldChecks(next);
  return { items: next, ok: allSubmitted };
}

async function readApprovedFieldChecks() {
  const supabase = await getSupabase();
  if (!supabase) return { items: [] as FieldCheck[], ok: false };
  const { data, error } = await supabase
    .from("field_checks")
    .select("client_id,category,note,place,created_at,photo_path")
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
    hasPhoto: Boolean(row.photo_path),
  }));
  return { items, ok: true };
}

export async function syncBaitLogicData(
  online: boolean,
  captchaTokens: { field?: string; email?: string } = {},
) {
  const local = readFieldChecks();
  if (!online || !backendConfigured) {
    return { fieldChecks: local, mode: online ? ("device" as const) : ("offline" as const), emailSynced: false };
  }

  const [submission, remote, emailStatus] = await Promise.all([
    submitPendingFieldChecks(local, captchaTokens.field),
    readApprovedFieldChecks(),
    syncWeeklyEmail(captchaTokens.email),
  ]);
  const merged = new Map<string, FieldCheck>();
  submission.items.forEach((item) => merged.set(item.id, item));
  remote.items.forEach((item) => merged.set(item.id, item));
  const fieldChecks = Array.from(merged.values()).sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
  persistFieldChecks(fieldChecks);

  return {
    fieldChecks,
    mode: submission.ok && remote.ok ? ("synced" as const) : ("device" as const),
    emailSynced: emailStatus === "synced",
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
