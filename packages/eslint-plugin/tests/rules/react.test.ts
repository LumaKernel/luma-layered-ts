import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../src/rules/react";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require("@typescript-eslint/parser"),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
});

ruleTester.run("react", rule, {
  valid: [
    // --- Imports ---
    // ui/components imports ui/hooks
    {
      code: `import { useFoo } from "../hooks/bar";`,
      filename: "/project/src/ui/components/foo.tsx",
    },
    // ui/components imports core
    {
      code: `import { Foo } from "../../core/foo";`,
      filename: "/project/src/ui/components/foo.tsx",
    },
    // ui/pages imports components, hooks, service, core
    {
      code: `import { Card } from "../components/bar";`,
      filename: "/project/src/ui/pages/foo.tsx",
    },
    {
      code: `import { useFoo } from "../hooks/bar";`,
      filename: "/project/src/ui/pages/foo.tsx",
    },
    {
      code: `import { Foo } from "../../service/bar";`,
      filename: "/project/src/ui/pages/foo.tsx",
    },
    // external packages always fine
    {
      code: `import React from "react";`,
      filename: "/project/src/ui/components/foo.tsx",
    },

    // --- Non-UI files: not checked by this rule ---
    { code: `JSON.parse(data);`, filename: "/project/src/core/foo.ts" },
    { code: `str.split(",");`, filename: "/project/src/adapter/parse.ts" },
    { code: `JSON.parse(data);`, filename: "/project/src/main.ts" },

    // --- components: display/trim/toString allowed ---
    {
      code: `user.name.display();`,
      filename: "/project/src/ui/components/card.tsx",
    },
    { code: `text.trim();`, filename: "/project/src/ui/components/card.tsx" },
    {
      code: `value.toString();`,
      filename: "/project/src/ui/components/card.tsx",
    },

    // --- hooks/pages: toString allowed ---
    {
      code: `value.toString();`,
      filename: "/project/src/ui/hooks/use-data.ts",
    },
    { code: `value.toString();`, filename: "/project/src/ui/pages/home.tsx" },

    // --- Unrelated methods fine ---
    { code: `arr.map(fn);`, filename: "/project/src/ui/hooks/use-data.ts" },
    {
      code: `arr.filter(fn);`,
      filename: "/project/src/ui/components/list.tsx",
    },
    { code: `effect.pipe(fn);`, filename: "/project/src/ui/pages/home.tsx" },

    // --- Property access on non-global ---
    { code: `obj.JSON;`, filename: "/project/src/ui/hooks/use-data.ts" },
  ],
  invalid: [
    // --- Import violations ---
    {
      code: `import { Foo } from "../../adapter/bar";`,
      filename: "/project/src/ui/hooks/foo.ts",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "ui/hooks", toLayer: "adapter" },
        },
      ],
    },
    {
      code: `import { Foo } from "../../service/bar";`,
      filename: "/project/src/ui/components/foo.tsx",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "ui/components", toLayer: "service" },
        },
      ],
    },
    {
      code: `import { Foo } from "../../adapter/bar";`,
      filename: "/project/src/ui/components/foo.tsx",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "ui/components", toLayer: "adapter" },
        },
      ],
    },

    // --- Imports to non-layer alias paths ---
    {
      code: `import { Board } from "@/engines/chess/board";`,
      filename: "/project/src/ui/components/chess.tsx",
      errors: [
        {
          messageId: "importNonLayer",
          data: { importPath: "@/engines/chess/board" },
        },
      ],
    },
    {
      code: `import { GAME_TYPES } from "@/lib/constants";`,
      filename: "/project/src/ui/components/sidebar.tsx",
      errors: [
        {
          messageId: "importNonLayer",
          data: { importPath: "@/lib/constants" },
        },
      ],
    },

    // --- Encoding globals ---
    {
      code: `JSON.parse(data);`,
      filename: "/project/src/ui/hooks/use-data.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "JSON", layer: "ui/hooks" },
        },
      ],
    },
    {
      code: `JSON.stringify(data);`,
      filename: "/project/src/ui/components/card.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "JSON", layer: "ui/components" },
        },
      ],
    },
    {
      code: `JSON.parse(text);`,
      filename: "/project/src/ui/pages/home.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "JSON", layer: "ui/pages" },
        },
      ],
    },
    {
      code: `parseInt("42");`,
      filename: "/project/src/ui/hooks/use-data.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "parseInt", layer: "ui/hooks" },
        },
      ],
    },
    {
      code: `parseFloat("3.14");`,
      filename: "/project/src/ui/components/card.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "parseFloat", layer: "ui/components" },
        },
      ],
    },
    {
      code: `atob(encoded);`,
      filename: "/project/src/ui/pages/home.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "atob", layer: "ui/pages" },
        },
      ],
    },
    {
      code: `Number("42");`,
      filename: "/project/src/ui/hooks/use-data.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Number", layer: "ui/hooks" },
        },
      ],
    },
    {
      code: `new Date();`,
      filename: "/project/src/ui/components/card.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Date", layer: "ui/components" },
        },
      ],
    },
    {
      code: `Date.now();`,
      filename: "/project/src/ui/pages/home.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Date", layer: "ui/pages" },
        },
      ],
    },

    // --- Schema boundary ---
    {
      code: `Schema.decodeUnknown(S)(d);`,
      filename: "/project/src/ui/hooks/use-user.ts",
      errors: [
        {
          messageId: "schemaBoundary",
          data: { method: "decodeUnknown", layer: "ui/hooks" },
        },
      ],
    },
    {
      code: `Schema.encodeSync(S)(d);`,
      filename: "/project/src/ui/components/user-card.tsx",
      errors: [
        {
          messageId: "schemaBoundary",
          data: { method: "encodeSync", layer: "ui/components" },
        },
      ],
    },
    {
      code: `Schema.decodeSync(S)(d);`,
      filename: "/project/src/ui/pages/home.tsx",
      errors: [
        {
          messageId: "schemaBoundary",
          data: { method: "decodeSync", layer: "ui/pages" },
        },
      ],
    },

    // --- String interpretation in hooks (all forbidden) ---
    {
      code: `str.split(",");`,
      filename: "/project/src/ui/hooks/use-data.ts",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "split", layer: "ui/hooks" },
        },
      ],
    },
    {
      code: `str.includes("foo");`,
      filename: "/project/src/ui/hooks/use-data.ts",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "includes", layer: "ui/hooks" },
        },
      ],
    },
    {
      code: `str.trim();`,
      filename: "/project/src/ui/hooks/use-data.ts",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "trim", layer: "ui/hooks" },
        },
      ],
    },
    {
      code: `str.match(/foo/);`,
      filename: "/project/src/ui/hooks/use-data.ts",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "match", layer: "ui/hooks" },
        },
      ],
    },

    // --- String interpretation in components (parse methods forbidden) ---
    {
      code: `str.split(",");`,
      filename: "/project/src/ui/components/card.tsx",
      errors: [
        { messageId: "componentParseMethod", data: { method: "split" } },
      ],
    },
    {
      code: `str.match(/pattern/);`,
      filename: "/project/src/ui/components/card.tsx",
      errors: [
        { messageId: "componentParseMethod", data: { method: "match" } },
      ],
    },
    {
      code: `str.includes("test");`,
      filename: "/project/src/ui/components/card.tsx",
      errors: [
        { messageId: "componentParseMethod", data: { method: "includes" } },
      ],
    },
    {
      code: `str.replace("a", "b");`,
      filename: "/project/src/ui/components/card.tsx",
      errors: [
        { messageId: "componentParseMethod", data: { method: "replace" } },
      ],
    },
    {
      code: `str.startsWith("http");`,
      filename: "/project/src/ui/components/card.tsx",
      errors: [
        { messageId: "componentParseMethod", data: { method: "startsWith" } },
      ],
    },
    {
      code: `str.slice(0, 5);`,
      filename: "/project/src/ui/components/card.tsx",
      errors: [
        { messageId: "componentParseMethod", data: { method: "slice" } },
      ],
    },

    // --- String interpretation in pages (all forbidden) ---
    {
      code: `str.split(",");`,
      filename: "/project/src/ui/pages/home.tsx",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "split", layer: "ui/pages" },
        },
      ],
    },
    {
      code: `str.includes("foo");`,
      filename: "/project/src/ui/pages/home.tsx",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "includes", layer: "ui/pages" },
        },
      ],
    },
  ],
});
