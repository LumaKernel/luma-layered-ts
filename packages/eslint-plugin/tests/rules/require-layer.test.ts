import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../src/rules/require-layer";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require("@typescript-eslint/parser"),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
});

ruleTester.run("require-layer", rule, {
  valid: [
    // Files in recognized layers
    { code: `const x = 1;`, filename: "/project/src/core/foo.ts" },
    { code: `const x = 1;`, filename: "/project/src/service/bar.ts" },
    { code: `const x = 1;`, filename: "/project/src/adapter/api.ts" },
    { code: `const x = 1;`, filename: "/project/src/infra/db.ts" },
    { code: `const x = 1;`, filename: "/project/src/ui/hooks/use-data.ts" },
    {
      code: `const x = 1;`,
      filename: "/project/src/ui/components/card.tsx",
    },
    { code: `const x = 1;`, filename: "/project/src/ui/pages/home.tsx" },
    // Nested paths within layers
    {
      code: `const x = 1;`,
      filename: "/project/src/core/schemas/user.ts",
    },
    // Next.js app router (recognized as app/ layers)
    { code: `const x = 1;`, filename: "/project/src/app/page.tsx" },
    { code: `const x = 1;`, filename: "/project/src/app/layout.tsx" },
    { code: `const x = 1;`, filename: "/project/src/app/api/route.ts" },
    {
      code: `const x = 1;`,
      filename: "/project/src/app/api/game/route.ts",
    },
    {
      code: `const x = 1;`,
      filename: "/project/src/app/game/page.tsx",
    },
    // Composition root
    { code: `const x = 1;`, filename: "/project/src/main.ts" },
    { code: `const x = 1;`, filename: "/project/src/main.tsx" },
    // Test files: excluded (even if outside layer dirs)
    {
      code: `const x = 1;`,
      filename: "/project/src/engines/chess/board.test.ts",
    },
    {
      code: `const x = 1;`,
      filename: "/project/src/lib/kv.spec.ts",
    },
    // Story files: excluded (fixture data)
    {
      code: `const x = 1;`,
      filename: "/project/src/engines/chess/board.stories.tsx",
    },
    // Files outside src/ entirely
    { code: `const x = 1;`, filename: "/project/scripts/build.ts" },
    { code: `const x = 1;`, filename: "/project/tests/e2e.test.ts" },
  ],
  invalid: [
    // Files under src/ but not in any layer
    {
      code: `const x = 1;`,
      filename: "/project/src/engines/chess/board.ts",
      errors: [{ messageId: "noLayer" }],
    },
    {
      code: `const x = 1;`,
      filename: "/project/src/lib/constants.ts",
      errors: [{ messageId: "noLayer" }],
    },
    {
      code: `const x = 1;`,
      filename: "/project/src/utils/helpers.ts",
      errors: [{ messageId: "noLayer" }],
    },
    {
      code: `const x = 1;`,
      filename: "/project/src/components/button.tsx",
      errors: [{ messageId: "noLayer" }],
    },
    {
      code: `const x = 1;`,
      filename: "/project/src/hooks/use-auth.ts",
      errors: [{ messageId: "noLayer" }],
    },
  ],
});
