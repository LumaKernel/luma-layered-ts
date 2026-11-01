import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../src/rules/codec-placement";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require("@typescript-eslint/parser"),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
});

function invalid(code: string, name: string, layer: string, filename: string) {
  return {
    code,
    filename,
    errors: [
      { messageId: "codecOutsideAdapter" as const, data: { name, layer } },
    ],
  };
}

ruleTester.run("codec-placement", rule, {
  valid: [
    // adapter / infra define codecs
    {
      code: `export function serializeItem(i: Item): string { return ""; }`,
      filename: "/project/src/adapter/item.ts",
    },
    {
      code: `export const parseRow = (row: Row) => row;`,
      filename: "/project/src/infra/db.ts",
    },
    // Calling codecs is governed by the import matrix, not this rule
    {
      code: `const item = decodeItem(raw);`,
      filename: "/project/src/ui/hooks/use-item.ts",
    },
    // Names that only start with the same letters
    {
      code: `const parsed = 1; function parser() {} const decoder = () => 1; function encoded() {}`,
      filename: "/project/src/core/foo.ts",
    },
    // Non-function values
    {
      code: `const parseResult = run(); interface X { decodeCount: number }`,
      filename: "/project/src/core/foo.ts",
    },
    // .display() and format* are human-readable output, not codecs
    {
      code: `const item = { display: () => "x", formatLabel: () => "y" };`,
      filename: "/project/src/core/item.ts",
    },
    // Tests and non-layer files are not checked
    {
      code: `function parseFixture() {}`,
      filename: "/project/src/core/item.test.ts",
    },
    { code: `function parseArgs() {}`, filename: "/project/scripts/gen.ts" },
  ],
  invalid: [
    invalid(
      `export function serializeItem(i: Item): string { return ""; }`,
      "serializeItem",
      "core",
      "/project/src/core/item.ts",
    ),
    invalid(
      `export const deserializeItem = (s: string) => s;`,
      "deserializeItem",
      "service",
      "/project/src/service/item.ts",
    ),
    invalid(
      `export const decode = function (s: string) { return s; };`,
      "decode",
      "ui/hooks",
      "/project/src/ui/hooks/use-item.ts",
    ),
    invalid(
      `class Item { encodeKey() { return ""; } }`,
      "encodeKey",
      "core",
      "/project/src/core/item.ts",
    ),
    invalid(
      `class Item { parse_v2 = (s: string) => s; }`,
      "parse_v2",
      "core",
      "/project/src/core/item.ts",
    ),
    invalid(
      `const codec = { serializeItem(i: Item) { return ""; } };`,
      "serializeItem",
      "core",
      "/project/src/core/item.ts",
    ),
    invalid(
      `const codec = { "decodeItem": (s: string) => s };`,
      "decodeItem",
      "core",
      "/project/src/core/item.ts",
    ),
    invalid(
      `interface Logic { serializeItem(i: Item): string }`,
      "serializeItem",
      "core",
      "/project/src/core/types.ts",
    ),
    invalid(
      `type Logic = { parseItem: (s: string) => Item };`,
      "parseItem",
      "core",
      "/project/src/core/types.ts",
    ),
    invalid(
      `export function parseQuery(q: string) { return q; }`,
      "parseQuery",
      "app/pages",
      "/project/src/app/page.tsx",
    ),
    invalid(
      `function encodeBody(b: Body) { return b; }`,
      "encodeBody",
      "app/api",
      "/project/src/app/api/route.ts",
    ),
  ],
});
