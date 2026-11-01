import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../src/rules/strict-collection";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require("@typescript-eslint/parser"),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
});

ruleTester.run("strict-collection", rule, {
  valid: [
    {
      code: `import type { StrictReadonlyMap } from "@luma-layered-ts/types";\nconst m: StrictReadonlyMap<string, number> = toStrictReadonlyMap(new Map());`,
      filename: "/project/src/core/foo.ts",
    },
    // Inferred types are not references
    {
      code: `const m = new Map([["a", 1]]);`,
      filename: "/project/src/adapter/foo.ts",
    },
    // Namespaced names are other types
    { code: `let m: Lib.ReadonlyMap;`, filename: "/project/src/core/foo.ts" },
  ],
  invalid: [
    {
      code: `const m: ReadonlyMap<string, number> = new Map();`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "useStrictCollection",
          data: {
            name: "ReadonlyMap",
            replacement: "StrictReadonlyMap",
            detail: " and get() returns undefined",
          },
        },
      ],
    },
    // Every layer, including adapter, ui and non-layer files
    ...[
      "/project/src/adapter/foo.ts",
      "/project/src/ui/components/card.tsx",
      "/project/src/app/page.tsx",
      "/project/scripts/gen.ts",
    ].map((filename) => ({
      code: `function f(s: ReadonlySet<string>) {}`,
      filename,
      errors: [
        {
          messageId: "useStrictCollection" as const,
          data: {
            name: "ReadonlySet",
            replacement: "StrictReadonlySet",
            detail: "",
          },
        },
      ],
    })),
    {
      code: `type T = { items: ReadonlyMap<string, ReadonlySet<number>> };`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "useStrictCollection",
          data: {
            name: "ReadonlyMap",
            replacement: "StrictReadonlyMap",
            detail: " and get() returns undefined",
          },
        },
        {
          messageId: "useStrictCollection",
          data: {
            name: "ReadonlySet",
            replacement: "StrictReadonlySet",
            detail: "",
          },
        },
      ],
    },
  ],
});
