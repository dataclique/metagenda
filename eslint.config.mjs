// @ts-check
//
// Ported from the 2024 cli/bot eslint.config.mjs (recovered from git
// history at 00ff6e3) to the repository root. Preset stack preserved:
// eslint recommended + typescript-eslint strictTypeChecked +
// stylisticTypeChecked, with the same two rule relaxations. The
// type-checked presets are scoped to the pi tree, where the parser
// project exists; other trees are out of lint scope.

import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

const piScope = ["pi/**/*.ts"]

export default tseslint.config(
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
  { ...eslint.configs.recommended, files: piScope },
  ...tseslint.configs.strictTypeChecked.map(entry => ({
    ...entry,
    files: piScope,
  })),
  ...tseslint.configs.stylisticTypeChecked.map(entry => ({
    ...entry,
    files: piScope,
  })),
  {
    files: piScope,
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
