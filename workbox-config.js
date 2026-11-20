// Precaches the exported app shell so the home-screen app opens offline.
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,html,css,ttf,ico,png,json,wasm}'],
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
  // Workbox ignores node_modules/ by default, but Expo exports the sqlite wasm under dist/assets/node_modules/.
  // picker.html is left to the network so it keeps its own headers (no cross-origin isolation; see public/_headers).
  globIgnores: ['sw.js', 'workbox-*.js', 'picker.html'],
  swDest: 'dist/sw.js',
  // expo-router "single" output: every route is served by index.html
  navigateFallback: '/index.html',
  // Static pages (Cloudflare serves them without .html) that must not get the app shell.
  navigateFallbackDenylist: [/^\/picker/, /^\/oauth-callback/],
  ignoreURLParametersMatching: [/^utm_/, /^code$/, /^state$/, /^scope$/, /^authuser$/, /^prompt$/],
};
