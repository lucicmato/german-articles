import react from '@vitejs/plugin-react';

import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

/**
 * The CSP is injected as a <meta> tag at build time because `connect-src` has to name the API, and
 * its URL is only known per environment. Build-only: the dev server's inline React Refresh preamble
 * would be blocked by `script-src 'self'`. Inline styles stay allowed — MUI/Emotion injects <style>.
 */
const contentSecurityPolicy = (apiUrl) => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          `connect-src 'self' ${new URL(apiUrl).origin}`,
          "base-uri 'self'",
          "form-action 'none'",
          "object-src 'none'",
        ].join('; '),
      },
      injectTo: 'head-prepend',
    },
  ],
});

// Must match public/og-image.png; crawlers use the size to lay out the preview before downloading it.
const OG_IMAGE = {
  path: 'og-image.png',
  width: 1200,
  height: 630,
  alt: 'Der, die ili das? — vježba njemačkih članova',
};

/**
 * `og:url`, `og:image` and `canonical` must be absolute, so they are only emitted when the public URL
 * is known: `SITE_URL` if set (custom domain), otherwise the production domain Vercel exposes at build
 * time. Without either (local builds) the tags are left out rather than pointing at localhost.
 */
const siteUrlTags = (siteUrl) => ({
  name: 'site-url-tags',
  apply: 'build',
  transformIndexHtml: () => {
    if (!siteUrl) return [];

    const imageUrl = new URL(OG_IMAGE.path, siteUrl).href;
    const meta = (key, name, content) => ({ tag: 'meta', attrs: { [key]: name, content }, injectTo: 'head' });

    return [
      { tag: 'link', attrs: { rel: 'canonical', href: siteUrl }, injectTo: 'head' },
      meta('property', 'og:url', siteUrl),
      meta('property', 'og:image', imageUrl),
      meta('property', 'og:image:width', String(OG_IMAGE.width)),
      meta('property', 'og:image:height', String(OG_IMAGE.height)),
      meta('property', 'og:image:alt', OG_IMAGE.alt),
      meta('name', 'twitter:image', imageUrl),
      meta('name', 'twitter:image:alt', OG_IMAGE.alt),
    ];
  },
});

const resolveSiteUrl = ({ SITE_URL, VERCEL_PROJECT_PRODUCTION_URL }) => {
  if (SITE_URL) return new URL(SITE_URL).href;
  return VERCEL_PROJECT_PRODUCTION_URL ? `https://${VERCEL_PROJECT_PRODUCTION_URL}/` : null;
};

// Port 3000 is what the backend's local CORS setup and the old CRA dev server both assumed.
export default defineConfig(({ mode }) => {
  // Empty prefix: Vercel's system variables are not VITE_-prefixed. Only the config sees them, not the bundle.
  const env = loadEnv(mode, process.cwd(), '');
  // Same fallback as API_URL in src/config.js, which cannot be imported here (no import.meta.env in Node).
  const { VITE_API_URL = 'http://localhost:4001' } = env;

  return {
    plugins: [react(), contentSecurityPolicy(VITE_API_URL), siteUrlTags(resolveSiteUrl(env))],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 3000 },
    preview: { port: 3000 },
  };
});
