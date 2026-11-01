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

function strict(
  code: string,
  name: string,
  replacement: string,
  filename = "/project/src/core/foo.ts",
) {
  return {
    code,
    filename,
    errors: [
      {
        messageId: "useStrictCollection" as const,
        data: { name, replacement },
      },
    ],
  };
}

ruleTester.run("strict-collection", rule, {
  valid: [
    {
      code: `import type { StrictReadonlyMap } from "@luma-layered-ts/types";\nconst m: StrictReadonlyMap<string, number> = toStrictReadonlyMap(new Map());`,
      filename: "/project/src/core/foo.ts",
    },
    // Inferred types are not references
    {
      code: `const m = new Map([["a", 1]]); const w = new WeakMap();`,
      filename: "/project/src/adapter/foo.ts",
    },
    // Qualified names other than globalThis are other types
    {
      code: `let m: Lib.ReadonlyMap; let s: Immutable.Set;`,
      filename: "/project/src/core/foo.ts",
    },
  ],
  invalid: [
    strict(
      `const m: ReadonlyMap<string, number> = x;`,
      "ReadonlyMap",
      "StrictReadonlyMap",
    ),
    strict(
      `function f(s: ReadonlySet<string>) {}`,
      "ReadonlySet",
      "StrictReadonlySet",
    ),
    strict(
      `const m: Map<string, number> = new Map();`,
      "Map",
      "StrictReadonlyMap",
    ),
    strict(`type T = { s: Set<string> };`, "Set", "StrictReadonlySet"),
    strict(
      `let m: globalThis.ReadonlyMap<string, number>;`,
      "ReadonlyMap",
      "StrictReadonlyMap",
    ),
    strict(
      `let m: globalThis.Map<string, number>;`,
      "Map",
      "StrictReadonlyMap",
    ),
    // Every layer, including adapter, ui and non-layer files
    ...[
      "/project/src/adapter/foo.ts",
      "/project/src/ui/components/card.tsx",
      "/project/src/app/page.tsx",
      "/project/scripts/gen.ts",
    ].map((filename) =>
      strict(
        `function f(s: ReadonlySet<string>) {}`,
        "ReadonlySet",
        "StrictReadonlySet",
        filename,
      ),
    ),
    ...["WeakMap", "WeakSet"].map((name) => ({
      code: `let c: ${name}<object>;`,
      filename: "/project/src/infra/cache.ts",
      errors: [{ messageId: "noMutableCollection" as const, data: { name } }],
    })),
    {
      code: `type T = { items: ReadonlyMap<string, Set<number>> };`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "useStrictCollection",
          data: { name: "ReadonlyMap", replacement: "StrictReadonlyMap" },
        },
        {
          messageId: "useStrictCollection",
          data: { name: "Set", replacement: "StrictReadonlySet" },
        },
      ],
    },
  ],
});
