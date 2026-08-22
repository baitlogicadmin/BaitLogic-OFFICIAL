import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const textExtensions = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".yml", ".yaml", ".md", ".txt", ".env", ".html", ".css", ".toml", ".sql", ".sh"
]);

const rules = [
  ["OpenAI/API-style secret", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ["GitHub personal access token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ["Resend API key value", /\bre_[A-Za-z0-9_-]{20,}\b/g],
  ["Private key material", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["Supabase service-role assignment", /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?(?!your_|change-|\$\{|process\.|Deno\.env)[A-Za-z0-9._-]{20,}/g],
  ["Turnstile secret assignment", /TURNSTILE_SECRET_KEY\s*=\s*["']?(?!your_|change-|\$\{|process\.|Deno\.env)[A-Za-z0-9._-]{20,}/g],
];

const findings = [];
for (const relative of files) {
  const ext = path.extname(relative).toLowerCase();
  const basename = path.basename(relative);
  if (!textExtensions.has(ext) && !basename.startsWith(".env")) continue;
  if (relative.includes("node_modules/")) continue;

  let text;
  try { text = readFileSync(path.join(repoRoot, relative), "utf8"); }
  catch { continue; }

  for (const [name, pattern] of rules) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`${name}: ${relative}`);
  }
}

if (findings.length) {
  console.error("Potential committed secrets detected. Values are intentionally not printed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Secret scan PASS — ${files.length} tracked paths checked; no high-risk credential patterns found.`);
