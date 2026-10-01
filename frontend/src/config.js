// The localhost fallback is repeated in vite.config.js (for the CSP) — keep the two in sync.
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

// Generous: the first request after idle pays for a Vercel cold start plus an Atlas connect.
export const API_TIMEOUT_MS = 15000;
