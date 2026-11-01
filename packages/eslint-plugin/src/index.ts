import server from "./rules/server";
import react from "./rules/react";
import next from "./rules/next";
import requireLayer from "./rules/require-layer";
import strictCollection from "./rules/strict-collection";
import type { TSESLint } from "@typescript-eslint/utils";

export const rules = {
  server,
  react,
  next,
  "require-layer": requireLayer,
  "strict-collection": strictCollection,
};

const plugin = {
  rules,
} satisfies TSESLint.Linter.Plugin;

export const configs = {
  recommended: {
    plugins: {
      "@luma-layered-ts": plugin,
    },
    rules: {
      "@luma-layered-ts/server": "error",
      "@luma-layered-ts/react": "error",
      "@luma-layered-ts/require-layer": "error",
      "@luma-layered-ts/strict-collection": "error",
    },
  } satisfies TSESLint.FlatConfig.Config,
  "recommended-next": {
    plugins: {
      "@luma-layered-ts": plugin,
    },
    rules: {
      "@luma-layered-ts/server": "error",
      "@luma-layered-ts/react": "error",
      "@luma-layered-ts/next": "error",
      "@luma-layered-ts/require-layer": "error",
      "@luma-layered-ts/strict-collection": "error",
    },
  } satisfies TSESLint.FlatConfig.Config,
};
