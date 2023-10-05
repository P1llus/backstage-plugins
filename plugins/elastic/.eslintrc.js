module.exports = require('@backstage/cli/config/eslint-factory')(__dirname, {
    plugins: [
      "license-header"
    ],
    overrides: [
      {
        files: [ "src/**/*.{ts,tsx}" ],
        rules: {
          "license-header/header": [ "error", "resources/license-header.js" ]
        }
      }
    ]
});