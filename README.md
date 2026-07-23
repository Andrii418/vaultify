# 🔐 Vaultify

A zero-knowledge tool for securely sharing one-time secrets — passwords, API keys, confidential messages — through links the server is mathematically incapable of reading.

## How it works

1. Content is encrypted **locally in the browser** using AES-256-GCM before anything is sent over the network.
2. The decryption key lives exclusively in the URL fragment (`#k=...`) — browsers never send URL fragments to the server by design, so the key physically never reaches the database or server logs.
3. The database (Supabase/PostgreSQL) stores nothing but encrypted ciphertext.
4. After a single read, the secret is atomically deleted from the database within one SQL transaction (`SELECT ... FOR UPDATE` + `DELETE`), eliminating any race condition where two simultaneous requests could both read the same one-time secret.

## Tech stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion, Shadcn UI (Base UI)
- **Cryptography**: the browser's native Web Crypto API (AES-GCM 256-bit, PBKDF2 with 600,000 iterations)
- **Backend**: Supabase (PostgreSQL, Row Level Security, pg_cron)
- **Hosting**: Vercel

## Security

- Row Level Security: no `SELECT` policy exists for public roles — the only way to read a secret is through a tightly scoped `SECURITY DEFINER` RPC function.
- Expired secrets are automatically purged every 15 minutes via `pg_cron`.
- Optional password protection, deriving the encryption key with PBKDF2 instead of embedding a random key in the URL.

## Running locally

\`\`\`bash
npm install
cp .env.example .env.local  # fill in with your own Supabase keys
npm run dev
\`\`\`