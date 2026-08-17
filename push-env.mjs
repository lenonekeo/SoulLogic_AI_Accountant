import { readFileSync, writeFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

// Values are written without a trailing newline: Vercel stores whatever it
// receives, and a newline inside APP_URL or STRIPE_WEBHOOK_SECRET silently
// broke document links and webhook signature verification.
const content = readFileSync('.env.local', 'utf8');
const lines = content.split('\n');

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;

  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();

  // Strip surrounding double quotes
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }

  // Write value to a temp file to avoid any shell escaping issues
  const tmpFile = join(tmpdir(), `vercel_env_${key}.txt`);
  writeFileSync(tmpFile, val);

  try {
    execSync(`npx vercel env rm ${key} production --yes 2>nul || true`, { stdio: 'ignore' });
    execSync(`npx vercel env add ${key} production --yes < "${tmpFile}"`, { stdio: ['pipe', 'inherit', 'ignore'], input: val });
    console.log(`✓ ${key}`);
  } catch (e) {
    // Try alternative approach
    try {
      const result = execSync(`npx vercel env add ${key} production --yes`, {
        input: val,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      console.log(`✓ ${key}`);
    } catch (e2) {
      console.error(`✗ ${key}: ${e2.stderr?.toString().slice(0, 120) || e2.message.slice(0, 120)}`);
    }
  }

  try { rmSync(tmpFile); } catch {}
}

console.log('\nDone!');
