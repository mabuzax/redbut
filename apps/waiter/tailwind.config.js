/**
 * Waiter dashboard Tailwind config
 * --------------------------------
 * Re-use **exactly** the same theme as the client (/web) app so both
 * sections stay visually consistent.  We simply extend the `content`
 * array with waiter-specific globs and export everything else from the
 * shared config.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

// Import base config from the client app
const clientConfig = require(
  path.resolve(__dirname, '..', 'web', 'tailwind.config.js'),
);

module.exports = {
  ...clientConfig,
  // Merge / override content paths so purge picks up waiter files as well
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    ...(clientConfig.content || []),
  ],
  /**
   * Ensure colour utilities such as `bg-background`, `text-foreground`
   * exist at compile-time (Tailwind will error if `@apply bg-background`
   * is used without a matching colour in the theme).
   *
   * We copy the CSS-variable driven palette that the client app uses so
   * the waiter section remains visually consistent.
   */
  theme: {
    ...(clientConfig.theme || {}),
    extend: {
      ...(clientConfig.theme?.extend || {}),
      colors: {
        ...(clientConfig.theme?.extend?.colors || {}),
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        border: 'var(--border)',
        primary: clientConfig.theme?.extend?.colors?.primary || {
          500: '#ff3b3b', // fallback if not found
        },
      },
    },
  },
};
