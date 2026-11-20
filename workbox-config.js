// Precaches the exported app shell so the home-screen app opens offline.
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,html,css,ttf,ico,png,json,wasm}'],
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
  // Workbox ignores node_modules/ by default, but Expo exports the sqlite wasm under dist/assets/node_modules/.
  globIgnores: ['sw.js', 'workbox-*.js'],
  swDest: 'dist/sw.js',
  // expo-router "single" output: every route is served by index.html
  navigateFallback: '/index.html',
  ignoreURLParametersMatching: [/^utm_/, /^code$/, /^state$/, /^scope$/, /^authuser$/, /^prompt$/],
};
