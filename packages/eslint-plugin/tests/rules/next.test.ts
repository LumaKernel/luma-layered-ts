import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../src/rules/next";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require("@typescript-eslint/parser"),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
});

ruleTester.run("next", rule, {
  valid: [
    // --- app/api: import matrix (can import core, service, adapter, infra) ---
    {
      code: `import { Foo } from "../../core/foo";`,
      filename: "/project/src/app/api/route.ts",
    },
    {
      code: `import { Foo } from "../../service/foo";`,
      filename: "/project/src/app/api/route.ts",
    },
    {
      code: `import { Foo } from "../../adapter/foo";`,
      filename: "/project/src/app/api/route.ts",
    },
    {
      code: `import { Foo } from "../../infra/foo";`,
      filename: "/project/src/app/api/route.ts",
    },
    // app/api: encoding globals, IO globals, string methods all allowed (wiring root)
    {
      code: `JSON.parse(body);`,
      filename: "/project/src/app/api/route.ts",
    },
    {
      code: `fetch(url);`,
      filename: "/project/src/app/api/route.ts",
    },
    {
      code: `process.env.API_KEY;`,
      filename: "/project/src/app/api/route.ts",
    },
    {
      code: `str.split(",");`,
      filename: "/project/src/app/api/route.ts",
    },
    {
      code: `Temporal.Now.instant();`,
      filename: "/project/src/app/api/route.ts",
    },
    // Nested api routes
    {
      code: `import { Foo } from "../../../core/foo";`,
      filename: "/project/src/app/api/game/route.ts",
    },

    // --- app/pages: import matrix (can import core, service, ui/* including containers) ---
    {
      code: `import { Foo } from "../core/foo";`,
      filename: "/project/src/app/page.tsx",
    },
    {
      code: `import { Foo } from "../service/foo";`,
      filename: "/project/src/app/page.tsx",
    },
    {
      code: `import { useFoo } from "../ui/hooks/bar";`,
      filename: "/project/src/app/page.tsx",
    },
    {
      code: `import { Card } from "../ui/components/bar";`,
      filename: "/project/src/app/page.tsx",
    },
    {
      code: `import { Home } from "../ui/pages/home";`,
      filename: "/project/src/app/page.tsx",
    },
    {
      code: `import { GameContainer } from "../ui/containers/game";`,
      filename: "/project/src/app/page.tsx",
    },
    // app/pages: toString allowed
    {
      code: `value.toString();`,
      filename: "/project/src/app/page.tsx",
    },
    // External packages always fine
    {
      code: `import React from "react";`,
      filename: "/project/src/app/layout.tsx",
    },

    // --- Test files: excluded ---
    {
      code: `JSON.parse(data);`,
      filename: "/project/src/app/api/move/route.test.ts",
    },
    {
      code: `str.split(",");`,
      filename: "/project/src/app/page.test.tsx",
    },

    // --- Non-app files: not checked by this rule ---
    { code: `JSON.parse(data);`, filename: "/project/src/core/foo.ts" },
    {
      code: `str.split(",");`,
      filename: "/project/src/ui/components/card.tsx",
    },
  ],
  invalid: [
    // --- app/api: import violations ---
    {
      code: `import { useFoo } from "../../ui/hooks/bar";`,
      filename: "/project/src/app/api/route.ts",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "app/api", toLayer: "ui/hooks" },
        },
      ],
    },
    {
      code: `import { Card } from "../../ui/components/bar";`,
      filename: "/project/src/app/api/route.ts",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "app/api", toLayer: "ui/components" },
        },
      ],
    },
    {
      code: `import { Home } from "../../ui/pages/bar";`,
      filename: "/project/src/app/api/route.ts",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "app/api", toLayer: "ui/pages" },
        },
      ],
    },

    // --- app/pages: import violations ---
    {
      code: `import { Foo } from "../adapter/bar";`,
      filename: "/project/src/app/page.tsx",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "app/pages", toLayer: "adapter" },
        },
      ],
    },
    {
      code: `import { Foo } from "../infra/bar";`,
      filename: "/project/src/app/page.tsx",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "app/pages", toLayer: "infra" },
        },
      ],
    },

    // --- app/api: imports to non-layer alias paths ---
    {
      code: `import { getEngine } from "@/engines/types";`,
      filename: "/project/src/app/api/move/route.ts",
      errors: [
        {
          messageId: "importNonLayer",
          data: { importPath: "@/engines/types" },
        },
      ],
    },
    {
      code: `import { kv } from "@/lib/kv";`,
      filename: "/project/src/app/api/route.ts",
      errors: [
        {
          messageId: "importNonLayer",
          data: { importPath: "@/lib/kv" },
        },
      ],
    },

    // --- app/pages: imports to non-layer alias paths ---
    {
      code: `import { GAME_TYPES } from "@/lib/constants";`,
      filename: "/project/src/app/page.tsx",
      errors: [
        {
          messageId: "importNonLayer",
          data: { importPath: "@/lib/constants" },
        },
      ],
    },

    // --- app/pages: encoding globals banned ---
    {
      code: `JSON.parse(data);`,
      filename: "/project/src/app/page.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "JSON", layer: "app/pages" },
        },
      ],
    },
    {
      code: `parseInt("42");`,
      filename: "/project/src/app/layout.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "parseInt", layer: "app/pages" },
        },
      ],
    },
    {
      code: `new Date();`,
      filename: "/project/src/app/page.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Date", layer: "app/pages" },
        },
      ],
    },

    // --- app/pages: globalThis bypass banned ---
    {
      code: `const j = globalThis["JSON"];`,
      filename: "/project/src/app/page.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "globalThis", layer: "app/pages" },
        },
      ],
    },

    // --- app/pages: Intl banned ---
    {
      code: `new Intl.DateTimeFormat("ja-JP").format(ts);`,
      filename: "/project/src/app/page.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Intl", layer: "app/pages" },
        },
      ],
    },

    // --- app/pages: Temporal banned ---
    {
      code: `Temporal.Now.instant().epochMilliseconds;`,
      filename: "/project/src/app/page.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Temporal", layer: "app/pages" },
        },
      ],
    },

    // --- app/api: Temporal allowed (wiring root) ---
    // (valid case already covered by general "all allowed" pattern)

    // --- app/pages: schema boundary banned ---
    {
      code: `Schema.decodeSync(S)(d);`,
      filename: "/project/src/app/page.tsx",
      errors: [
        {
          messageId: "schemaBoundary",
          data: { method: "decodeSync", layer: "app/pages" },
        },
      ],
    },

    // --- app/pages: string interpretation banned ---
    {
      code: `str.split(",");`,
      filename: "/project/src/app/page.tsx",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "split", layer: "app/pages" },
        },
      ],
    },
    {
      code: `str.trim();`,
      filename: "/project/src/app/layout.tsx",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "trim", layer: "app/pages" },
        },
      ],
    },

    // --- Nested app pages also checked ---
    {
      code: `JSON.stringify(data);`,
      filename: "/project/src/app/game/page.tsx",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "JSON", layer: "app/pages" },
        },
      ],
    },
  ],
});
