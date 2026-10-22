import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/LumaKernel/luma-layered-ts/blob/main/prompts/eslint-rules.md#${name}`,
);

export { createRule };
