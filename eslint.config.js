// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Plan 1 spike screens are frozen while the Drive spike is tested on the iPhone; Plan 5 replaces them.
    ignores: ['dist/*', 'src/app/spikes/*'],
  },
]);
