// @ts-check
//
// Ported from the 2024 cli/bot eslint.config.mjs (recovered from git
// history at 00ff6e3) to the repository root. Preset stack preserved:
// eslint recommended + typescript-eslint strictTypeChecked +
// stylisticTypeChecked, with the same two rule relaxations.

import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    ignores: [
      "dist/",
      "test/",
      "packages/",
      "tooling/",
      "**/*.test.ts",
      "**/*.test.mjs",
      "eslint.config.mjs",
    ],
  },
  {
    files: ["pi/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
    languageOptions: {
      parserOptions: {
        project: ["pi/extensions/tsconfig.json"],
      },
    },
  },
)
