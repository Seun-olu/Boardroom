#!/usr/bin/env bash
# Quick check — run: npm run check:supabase
set -a
source .env.local 2>/dev/null || true
set +a

node --input-type=module -e "
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim()))
    .filter(([k]) => k)
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const pub =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url ? '✓ set' : '✗ missing');
console.log('Publishable:', pub ? \`✓ \${pub.slice(0, 20)}...\` : '✗ missing');
console.log('Secret:', secret ? \`✓ \${secret.slice(0, 20)}...\` : '✗ missing');

if (pub && secret && pub === secret) {
  console.error('\\n✗ Publishable and secret are THE SAME string — copy sb_secret_ from dashboard');
  process.exit(1);
}

if (secret?.startsWith('eyJ')) {
  const role = JSON.parse(Buffer.from(secret.split('.')[1], 'base64url')).role;
  console.log('Secret JWT role:', role);
  if (role === 'anon') {
    console.error('\\n✗ Secret key is anon — paste sb_secret_... or service_role JWT');
    process.exit(1);
  }
}

if (!url || !pub || !secret) {
  console.error('\\nFix .env.local then re-run npm run check:supabase');
  process.exit(1);
}

console.log('\\nKeys look correctly different. Testing DB write...');
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(url, secret);
const { error } = await sb.from('boards').upsert({
  id: '__env_check__',
  columns: [],
  cards: [],
  board: { name: 'check', initialized: false },
  updated_at: new Date().toISOString(),
});
if (error) {
  console.error('DB write failed:', error.message);
  if (error.code === '42501') console.error('→ Run supabase/fix-rls.sql in SQL Editor');
  process.exit(1);
}
await sb.from('boards').delete().eq('id', '__env_check__');
console.log('✓ DB write OK — restart npm run dev and refresh the board');
"
