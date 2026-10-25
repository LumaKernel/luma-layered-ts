import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../src/rules/server";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require("@typescript-eslint/parser"),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
});

ruleTester.run("server", rule, {
  valid: [
    // --- Imports ---
    // core imports self
    {
      code: `import { Foo } from "./bar";`,
      filename: "/project/src/core/foo.ts",
    },
    // service imports core
    {
      code: `import { Foo } from "../core/foo";`,
      filename: "/project/src/service/bar.ts",
    },
    // adapter imports core, service
    {
      code: `import { Foo } from "../core/foo";`,
      filename: "/project/src/adapter/bar.ts",
    },
    {
      code: `import { Foo } from "../service/foo";`,
      filename: "/project/src/adapter/bar.ts",
    },
    // infra imports adapter
    {
      code: `import { Foo } from "../adapter/foo";`,
      filename: "/project/src/infra/bar.ts",
    },
    // external packages always fine
    {
      code: `import { Effect } from "effect";`,
      filename: "/project/src/core/foo.ts",
    },
    // @/ alias imports to recognized layers are fine
    {
      code: `import { Foo } from "@/core/bar";`,
      filename: "/project/src/service/foo.ts",
    },
    {
      code: `import { Foo } from "@/service/bar";`,
      filename: "/project/src/adapter/foo.ts",
    },
    // non-layer files not checked
    {
      code: `import { Foo } from "./core/foo";`,
      filename: "/project/src/main.ts",
    },

    // --- adapter/infra: everything allowed ---
    { code: `JSON.parse(data);`, filename: "/project/src/adapter/api.ts" },
    { code: `fetch(url);`, filename: "/project/src/infra/http.ts" },
    { code: `process.env.API_KEY;`, filename: "/project/src/infra/config.ts" },
    { code: `str.split(",");`, filename: "/project/src/adapter/parse.ts" },
    { code: `parseInt("42");`, filename: "/project/src/adapter/parse.ts" },
    { code: `Number("42");`, filename: "/project/src/adapter/parse.ts" },
    {
      code: `String.fromCharCode(65);`,
      filename: "/project/src/adapter/format.ts",
    },
    { code: `String(42);`, filename: "/project/src/infra/log.ts" },
    { code: `new Date();`, filename: "/project/src/adapter/time.ts" },
    { code: `Date.now();`, filename: "/project/src/infra/clock.ts" },
    {
      code: `Temporal.Now.instant();`,
      filename: "/project/src/adapter/time.ts",
    },
    {
      code: `Temporal.Instant.fromEpochMilliseconds(ts);`,
      filename: "/project/src/infra/clock.ts",
    },
    {
      code: `Schema.decodeUnknown(S)(d);`,
      filename: "/project/src/adapter/api.ts",
    },
    { code: `atob(encoded);`, filename: "/project/src/adapter/decode.ts" },
    { code: `encodeURIComponent(s);`, filename: "/project/src/infra/url.ts" },

    // --- core/service: allowed operations ---
    // toString for logging
    { code: `value.toString();`, filename: "/project/src/service/foo.ts" },
    { code: `value.toString();`, filename: "/project/src/core/foo.ts" },
    // unrelated methods
    { code: `arr.map(fn);`, filename: "/project/src/core/foo.ts" },
    { code: `effect.pipe(fn);`, filename: "/project/src/service/bar.ts" },
    // property access on non-global
    { code: `obj.JSON;`, filename: "/project/src/core/foo.ts" },
    // array methods allowed (also exist on String but no type info to distinguish)
    { code: `arr.includes(item);`, filename: "/project/src/core/foo.ts" },
    { code: `arr.indexOf(item);`, filename: "/project/src/service/foo.ts" },
    { code: `arr.slice(0, 5);`, filename: "/project/src/core/foo.ts" },

    // --- Test files: excluded from layer checks ---
    {
      code: `JSON.parse(data);`,
      filename: "/project/src/core/foo.test.ts",
    },
    {
      code: `fetch(url);`,
      filename: "/project/src/service/bar.spec.ts",
    },
    {
      code: `str.split(",");`,
      filename: "/project/src/core/schema.test.ts",
    },
    {
      code: `import { Foo } from "@/engines/bar";`,
      filename: "/project/src/core/foo.stories.tsx",
    },

    // --- UI layers: not checked by this rule ---
    {
      code: `JSON.parse(data);`,
      filename: "/project/src/ui/hooks/use-data.ts",
    },
  ],
  invalid: [
    // --- Import violations ---
    {
      code: `import { Foo } from "../service/bar";`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "core", toLayer: "service" },
        },
      ],
    },
    {
      code: `import { Foo } from "../adapter/bar";`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "core", toLayer: "adapter" },
        },
      ],
    },
    {
      code: `import { Foo } from "../adapter/bar";`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "service", toLayer: "adapter" },
        },
      ],
    },
    {
      code: `import { Foo } from "../infra/bar";`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "service", toLayer: "infra" },
        },
      ],
    },
    {
      code: `import { Foo } from "../ui/components/bar";`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "importViolation",
          data: { fromLayer: "service", toLayer: "ui/components" },
        },
      ],
    },

    // --- Imports to non-layer alias paths ---
    {
      code: `import { Foo } from "@/engines/chess/board";`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "importNonLayer",
          data: { importPath: "@/engines/chess/board" },
        },
      ],
    },
    {
      code: `import { BAR } from "@/lib/constants";`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "importNonLayer",
          data: { importPath: "@/lib/constants" },
        },
      ],
    },
    {
      code: `import { Baz } from "@/utils/helper";`,
      filename: "/project/src/adapter/foo.ts",
      errors: [
        {
          messageId: "importNonLayer",
          data: { importPath: "@/utils/helper" },
        },
      ],
    },

    // --- Encoding globals in inner layers ---
    {
      code: `JSON.parse(data);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        { messageId: "encodedGlobal", data: { name: "JSON", layer: "core" } },
      ],
    },
    {
      code: `JSON.stringify(data);`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "JSON", layer: "service" },
        },
      ],
    },
    {
      code: `parseInt("42");`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "parseInt", layer: "core" },
        },
      ],
    },
    {
      code: `parseFloat("3.14");`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "parseFloat", layer: "service" },
        },
      ],
    },
    {
      code: `atob(encoded);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        { messageId: "encodedGlobal", data: { name: "atob", layer: "core" } },
      ],
    },
    {
      code: `btoa(data);`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "btoa", layer: "service" },
        },
      ],
    },
    {
      code: `encodeURIComponent(s);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "encodeURIComponent", layer: "core" },
        },
      ],
    },
    {
      code: `decodeURIComponent(s);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "decodeURIComponent", layer: "core" },
        },
      ],
    },
    {
      code: `String.fromCharCode(65);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "String", layer: "core" },
        },
      ],
    },
    {
      code: `String(42);`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "String", layer: "service" },
        },
      ],
    },
    {
      code: `Number("42");`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Number", layer: "core" },
        },
      ],
    },
    {
      code: `Number.isFinite(x);`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Number", layer: "service" },
        },
      ],
    },
    {
      code: `new Date();`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Date", layer: "core" },
        },
      ],
    },
    {
      code: `Date.now();`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Date", layer: "service" },
        },
      ],
    },

    // --- Temporal global in inner layers ---
    {
      code: `Temporal.Now.instant();`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Temporal", layer: "core" },
        },
      ],
    },
    {
      code: `Temporal.Instant.fromEpochMilliseconds(ts);`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Temporal", layer: "service" },
        },
      ],
    },

    // --- IO globals in inner layers ---
    {
      code: `fetch(url);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        { messageId: "ioGlobal", data: { name: "fetch", layer: "core" } },
      ],
    },
    {
      code: `fetch(url);`,
      filename: "/project/src/service/foo.ts",
      errors: [
        { messageId: "ioGlobal", data: { name: "fetch", layer: "service" } },
      ],
    },
    {
      code: `new Request(url);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        { messageId: "ioGlobal", data: { name: "Request", layer: "core" } },
      ],
    },
    {
      code: `process.env.FOO;`,
      filename: "/project/src/core/foo.ts",
      errors: [
        { messageId: "ioGlobal", data: { name: "process", layer: "core" } },
      ],
    },
    {
      code: `process.env.API_KEY;`,
      filename: "/project/src/service/foo.ts",
      errors: [
        { messageId: "ioGlobal", data: { name: "process", layer: "service" } },
      ],
    },
    {
      code: `new Response(body);`,
      filename: "/project/src/service/foo.ts",
      errors: [
        { messageId: "ioGlobal", data: { name: "Response", layer: "service" } },
      ],
    },

    // --- Schema boundary in inner layers ---
    {
      code: `Schema.decodeUnknown(S)(d);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "schemaBoundary",
          data: { method: "decodeUnknown", layer: "core" },
        },
      ],
    },
    {
      code: `Schema.encode(S)(d);`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "schemaBoundary",
          data: { method: "encode", layer: "service" },
        },
      ],
    },
    {
      code: `Schema.decodeSync(S)(d);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "schemaBoundary",
          data: { method: "decodeSync", layer: "core" },
        },
      ],
    },

    // --- String interpretation in inner layers ---
    {
      code: `str.split(",");`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "split", layer: "core" },
        },
      ],
    },
    {
      code: `str.match(/pattern/);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "match", layer: "core" },
        },
      ],
    },
    {
      code: `str.replace("a", "b");`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "replace", layer: "service" },
        },
      ],
    },
    {
      code: `str.trim();`,
      filename: "/project/src/core/foo.ts",
      errors: [
        { messageId: "encodedMethod", data: { method: "trim", layer: "core" } },
      ],
    },
    {
      code: `str.startsWith("http");`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "startsWith", layer: "service" },
        },
      ],
    },
    {
      code: `str.padStart(5, "0");`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedMethod",
          data: { method: "padStart", layer: "service" },
        },
      ],
    },
  ],
});
