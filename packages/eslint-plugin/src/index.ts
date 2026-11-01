import server from "./rules/server";
import react from "./rules/react";
import next from "./rules/next";
import requireLayer from "./rules/require-layer";
import strictCollection from "./rules/strict-collection";
import codecPlacement from "./rules/codec-placement";
import requireUnsafeDir from "./rules/require-unsafe-dir";
import type { TSESLint } from "@typescript-eslint/utils";

export const rules = {
  server,
  react,
  next,
  "require-layer": requireLayer,
  "strict-collection": strictCollection,
  "codec-placement": codecPlacement,
  "require-unsafe-dir": requireUnsafeDir,
};

const plugin = {
  rules,
} satisfies TSESLint.Linter.Plugin;

// Inline config is disabled everywhere, so `/* eslint-disable */` cannot suppress
// require-unsafe-dir itself. The "unsafe-dir" config re-enables it under _unsafe_/.
// When adding a config here, keep linterOptions and the require-unsafe-dir rule in it.
const baseLinterOptions = {
  noInlineConfig: true,
} satisfies TSESLint.FlatConfig.LinterOptions;

export const configs = {
  recommended: {
    plugins: {
      "@luma-layered-ts": plugin,
    },
    linterOptions: baseLinterOptions,
    rules: {
      "@luma-layered-ts/server": "error",
      "@luma-layered-ts/react": "error",
      "@luma-layered-ts/require-layer": "error",
      "@luma-layered-ts/strict-collection": "error",
      "@luma-layered-ts/codec-placement": "error",
      "@luma-layered-ts/require-unsafe-dir": "error",
    },
  } satisfies TSESLint.FlatConfig.Config,
  "recommended-next": {
    plugins: {
      "@luma-layered-ts": plugin,
    },
    linterOptions: baseLinterOptions,
    rules: {
      "@luma-layered-ts/server": "error",
      "@luma-layered-ts/react": "error",
      "@luma-layered-ts/next": "error",
      "@luma-layered-ts/require-layer": "error",
      "@luma-layered-ts/strict-collection": "error",
      "@luma-layered-ts/codec-placement": "error",
      "@luma-layered-ts/require-unsafe-dir": "error",
    },
  } satisfies TSESLint.FlatConfig.Config,
  // Must come after recommended / recommended-next
  "unsafe-dir": {
    files: ["**/_unsafe_/**"],
    linterOptions: {
      noInlineConfig: false,
      reportUnusedDisableDirectives: "error",
    },
  } satisfies TSESLint.FlatConfig.Config,
};
