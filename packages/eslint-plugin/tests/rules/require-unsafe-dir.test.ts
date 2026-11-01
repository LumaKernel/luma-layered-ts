import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../src/rules/require-unsafe-dir";

const ruleTester = new RuleTester({
  // Unscoped eslint-disable would suppress this rule itself; that case is covered with
  // noInlineConfig in tests/index.test.ts. Here eslint directives name another rule.
  linterOptions: { reportUnusedDisableDirectives: "off" },
  languageOptions: {
    parser: require("@typescript-eslint/parser"),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
});

const outside = "/project/src/core/foo.ts";

function invalid(code: string, directive: string, filename = outside) {
  return {
    code,
    filename,
    errors: [
      { messageId: "directiveOutsideUnsafeDir" as const, data: { directive } },
    ],
  };
}

function effect(
  code: string,
  name: string,
  filename = "/project/src/ui/hooks/foo.ts",
) {
  return {
    code,
    filename,
    errors: [{ messageId: "effectOutsideUnsafeDir" as const, data: { name } }],
  };
}

ruleTester.run("require-unsafe-dir", rule, {
  valid: [
    // Inside _unsafe_/: any directive allowed
    {
      code: `// eslint-disable-next-line no-console\nconsole.log(1);`,
      filename: "/project/src/core/_unsafe_/foo.ts",
    },
    {
      code: `// @ts-expect-error\nconst x: number = "a";\n/* v8 ignore next */\nf();`,
      filename: "/project/src/infra/kv/_unsafe_/client.ts",
    },
    {
      code: `/* eslint-disable */`,
      filename: "/project/scripts/_unsafe_/gen.ts",
    },
    {
      code: `import { useEffect } from "react";\nuseEffect(() => {}, []);`,
      filename: "/project/src/ui/hooks/_unsafe_/use-subscription.ts",
    },
    // Effect-like names that are not React effect hooks
    {
      code: `import { useEffectEvent, useMemo } from "react";`,
      filename: "/project/src/ui/hooks/foo.ts",
    },
    {
      code: `import { useEffect } from "./_unsafe_/use-effect";`,
      filename: "/project/src/ui/hooks/foo.ts",
    },
    // Inside _unsafe_/: direct calls, wrapped in a custom hook
    {
      code: `import { useEffect } from "react";\nexport function useSub() { useEffect(() => {}, []); }`,
      filename: "/project/src/ui/hooks/_unsafe_/use-sub.ts",
    },
    {
      code: `import * as React from "react";\nexport function useSub() { React.useLayoutEffect(() => {}); }`,
      filename: "/project/src/ui/hooks/_unsafe_/use-sub.ts",
    },
    {
      code: `import { useEffect, useMemo } from "react";\nexport { useMemo } from "react";`,
      filename: "/project/src/ui/hooks/_unsafe_/use-sub.ts",
    },
    // Class methods with other names
    {
      code: `class A extends Component { render() { return null; } }`,
      filename: "/project/src/ui/components/a.tsx",
    },
    // Computed access on non-React objects
    { code: `obj[key];`, filename: "/project/src/ui/hooks/foo.ts" },
    // Not directives
    { code: `// eslint is a linter\nconst x = 1;`, filename: outside },
    {
      code: `// see @ts-ignore usage in docs\nconst x = 1;`,
      filename: outside,
    },
    { code: `// eslint-enable\nconst x = 1;`, filename: outside },
    { code: `// v8 ignored this\nconst x = 1;`, filename: outside },
    { code: `/* prettier-ignore */\nconst x = 1;`, filename: outside },
    // Directory name must match exactly
    { code: `const x = 1;`, filename: "/project/src/core/unsafe/foo.ts" },
  ],
  invalid: [
    // ESLint
    invalid(`/* eslint-disable no-console */`, "eslint-disable"),
    invalid(
      `// eslint-disable-next-line no-console`,
      "eslint-disable-next-line",
    ),
    invalid(`f(); // eslint-disable-line no-console`, "eslint-disable-line"),
    invalid(`/* eslint no-console: off */`, "eslint"),
    // TypeScript
    invalid(`// @ts-ignore`, "@ts-ignore"),
    invalid(`// @ts-expect-error`, "@ts-expect-error"),
    invalid(`// @ts-nocheck`, "@ts-nocheck"),
    invalid(`/// @ts-ignore`, "@ts-ignore"),
    invalid(`/** @ts-ignore */`, "@ts-ignore"),
    // Coverage
    invalid(`/* istanbul ignore next */`, "istanbul ignore"),
    invalid(`/* c8 ignore next */`, "c8 ignore"),
    invalid(`/* v8 ignore next -- @preserve */`, "v8 ignore"),
    invalid(`// node:coverage disable`, "node:coverage disable"),
    // Other linters
    invalid(`// biome-ignore lint/style: reason`, "biome-ignore"),
    invalid(
      `// oxlint-disable-next-line no-console`,
      "oxlint-disable-next-line",
    ),
    // Test files are not exempt
    invalid(
      `// @ts-expect-error`,
      "@ts-expect-error",
      "/project/src/core/foo.test.ts",
    ),
    // A directory merely containing "_unsafe_" in its name is not enough
    invalid(
      `// @ts-ignore`,
      "@ts-ignore",
      "/project/src/core/not_unsafe_/foo.ts",
    ),
    // React effect hooks
    effect(`import { useEffect } from "react";`, "useEffect"),
    effect(
      `import { useLayoutEffect as useLE } from "react";`,
      "useLayoutEffect",
    ),
    effect(`import { useInsertionEffect } from "react";`, "useInsertionEffect"),
    effect(`import { useEffect } from "preact/hooks";`, "useEffect"),
    effect(`React.useEffect(() => {}, []);`, "useEffect"),
    effect(`const { useEffect } = React;`, "useEffect"),
    effect(
      `import { useEffect } from "react";`,
      "useEffect",
      "/project/src/ui/components/card.stories.tsx",
    ),
    effect(`obj["useEffect"];`, "useEffect"),
    effect(`React["useLayoutEffect"](() => {});`, "useLayoutEffect"),
    // Class component lifecycle
    ...[
      "componentDidMount",
      "componentDidUpdate",
      "componentWillUnmount",
      "UNSAFE_componentWillMount",
    ].map((name) => ({
      code: `class A extends Component { ${name}() {} }`,
      filename: "/project/src/ui/components/a.tsx",
      errors: [
        { messageId: "lifecycleOutsideUnsafeDir" as const, data: { name } },
      ],
    })),
    {
      code: `class A extends Component { componentDidMount = () => {}; }`,
      filename: "/project/src/ui/components/a.tsx",
      errors: [
        {
          messageId: "lifecycleOutsideUnsafeDir",
          data: { name: "componentDidMount" },
        },
      ],
    },
    // Computed access on React hides the API
    {
      code: `import * as React from "react";\nReact[key](() => {});`,
      filename: "/project/src/ui/hooks/foo.ts",
      errors: [{ messageId: "dynamicReactAccess", data: { name: "React" } }],
    },
    {
      code: `import R from "react";\nconst f = R[key];`,
      filename: "/project/src/ui/hooks/_unsafe_/foo.ts",
      errors: [{ messageId: "dynamicReactAccess", data: { name: "R" } }],
    },
    // Inside _unsafe_/: effect hooks must not leave the directory
    ...[
      [`export { useEffect } from "react";`, "useEffect"],
      [`export { useLayoutEffect as useLE } from "react";`, "useLayoutEffect"],
      [
        `import { useEffect } from "react";\nexport { useEffect };`,
        "useEffect",
      ],
      [
        `import { useEffect as e } from "react";\nexport const useE = e;`,
        "useEffect",
      ],
      [
        `import React from "react";\nexport default React.useEffect;`,
        "useEffect",
      ],
      [`import React from "react";\nconst { useEffect } = React;`, "useEffect"],
      [
        `import { useEffect } from "react";\nexport const run = (f: typeof useEffect) => f;\nrun(useEffect);`,
        "useEffect",
      ],
    ].map(([code, name]) => ({
      code,
      filename: "/project/src/ui/hooks/_unsafe_/use-sub.ts",
      errors: [{ messageId: "effectEscape" as const, data: { name } }],
    })),
    ...[
      "/project/src/ui/hooks/_unsafe_/index.ts",
      "/project/src/ui/hooks/index.ts",
    ].map((filename) => ({
      code: `export * from "react";`,
      filename,
      errors: [
        { messageId: "reactReexportAll" as const, data: { source: "react" } },
      ],
    })),

    // Each directive is reported
    {
      code: `// @ts-ignore\nconst a = 1;\n/* c8 ignore next */\nconst b = 2;`,
      filename: outside,
      errors: [
        {
          messageId: "directiveOutsideUnsafeDir",
          data: { directive: "@ts-ignore" },
        },
        {
          messageId: "directiveOutsideUnsafeDir",
          data: { directive: "c8 ignore" },
        },
      ],
    },
  ],
});
