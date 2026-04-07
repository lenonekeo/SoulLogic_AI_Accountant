import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const content = readFileSync('.env.local', 'utf8');
const match = content.match(/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="([\s\S]*?)"\n/);
if (!match) throw new Error('Could not find private key in .env.local');

const val = match[1]; // value without surrounding quotes, no trailing newline

execSync(`npx vercel env rm GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY production --yes`, { stdio: 'ignore' });
execSync(`npx vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY production --yes`, {
  input: val,   // no trailing \n
  stdio: ['pipe', 'inherit', 'inherit']
});
console.log('✓ GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY pushed cleanly');
