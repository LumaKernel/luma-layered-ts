import server from "./rules/server";
import react from "./rules/react";
import type { TSESLint } from "@typescript-eslint/utils";

export const rules = {
  server,
  react,
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
    },
  } satisfies TSESLint.FlatConfig.Config,
};
