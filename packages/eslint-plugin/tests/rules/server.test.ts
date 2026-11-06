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

    // Non-global names that happen to be "Date"
    {
      code: `obj.Date; const o = { Date: 1 }; class A { Date() {} } let t: Ns.Date;`,
      filename: "/project/src/infra/clock.ts",
    },
    // --- adapter: pure codec (deterministic, environment-independent) ---
    // Package allowlist: effect, @luma-layered-ts/types, type-only imports, configured packages
    ...[
      `import { Schema } from "effect/Schema";`,
      `import { PlainDate } from "@luma-layered-ts/types";`,
      `import type { PrismaClient } from "@prisma/client";`,
      `import { type Row } from "pg";`,
      `import { codec } from "./codec";`,
    ].map((code) => ({ code, filename: "/project/src/adapter/codec.ts" })),
    {
      code: `import { z } from "pure-lib/sub";`,
      filename: "/project/src/adapter/codec.ts",
      options: [{ adapterAllowedPackages: ["pure-lib"] }],
    },
    // Other layers are not restricted
    {
      code: `import { Pool } from "pg";`,
      filename: "/project/src/infra/db.ts",
    },
    ...[
      `new Intl.NumberFormat("ja-JP").format(n);`,
      `new Intl.DateTimeFormat(locale, opts);`,
      `new Intl.DateTimeFormat(locale, { ...base, hour: "2-digit" });`,
      `new Intl.Collator(locale).compare(a, b);`,
      `d.getUTCHours();`,
      `Temporal.ZonedDateTime.from(s);`,
    ].map((code) => ({ code, filename: "/project/src/adapter/format.ts" })),
    // infra may use the runtime locale
    { code: `d.toLocaleString();`, filename: "/project/src/infra/log.ts" },
    {
      code: `const f = (req: Request) => req.json();`,
      filename: "/project/src/adapter/request.ts",
    },
    {
      code: `new Response(JSON.stringify(body), { headers: new Headers() });`,
      filename: "/project/src/adapter/response.ts",
    },
    {
      code: `import { Schema } from "effect";`,
      filename: "/project/src/adapter/codec.ts",
    },
    {
      code: `import { fs } from "./fs";`,
      filename: "/project/src/adapter/codec.ts",
    },
    {
      code: `import { readFile } from "node:fs";`,
      filename: "/project/src/infra/file.ts",
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
    {
      code: `globalThis["JSON"];`,
      filename: "/project/src/infra/parse.ts",
    },
    {
      code: `Function("return this")();`,
      filename: "/project/src/infra/parse.ts",
    },
    {
      code: `new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo" }).format(ts);`,
      filename: "/project/src/adapter/format.ts",
    },
    {
      code: `performance.now();`,
      filename: "/project/src/infra/clock.ts",
    },
    {
      code: `performance.timeOrigin;`,
      filename: "/project/src/infra/clock.ts",
    },
    {
      code: `Temporal.Now.instant();`,
      filename: "/project/src/infra/clock.ts",
    },
    {
      code: `Temporal.Instant.fromEpochMilliseconds(ts);`,
      filename: "/project/src/infra/clock.ts",
    },
    {
      code: `Schema.decodeUnknownEffect(S)(d);`,
      filename: "/project/src/adapter/api.ts",
    },
    { code: `atob(encoded);`, filename: "/project/src/adapter/decode.ts" },
    { code: `encodeURIComponent(s);`, filename: "/project/src/infra/url.ts" },

    // --- core/service: allowed operations ---
    // effect 4 schema definitions (not boundary crossings)
    {
      code: `const S = Schema.String.pipe(Schema.decodeTo(Schema.Number, t), Schema.encode(g), Schema.decode(g));`,
      filename: "/project/src/core/foo.ts",
    },
    // String literals as constants and tags, template literals without interpolation
    {
      code: `const tag = "Black"; const t = \`fixed\`; type K = \`k_\${string}\`;`,
      filename: "/project/src/core/foo.ts",
    },
    // + without a string literal operand is assumed numeric
    { code: `const n = a + b; n += 1;`, filename: "/project/src/core/foo.ts" },
    // Strings are built in adapter
    {
      code: `const s = \`\${a}-\${b}\`; arr.join(",");`,
      filename: "/project/src/adapter/foo.ts",
    },
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
    // --- core/service: string construction ---
    ...(
      [
        ["const s = `${a}-${b}`;", "Template literal interpolation", "core"],
        ["const s = tag`${a}`;", "Template literal interpolation", "core"],
        ['const s = "#" + id;', "String concatenation", "core"],
        ["const s = id + `x`;", "String concatenation", "service"],
        ['s += "x";', "String concatenation", "core"],
        ['parts.join("/");', ".join()", "core"],
        ["value.toString();", ".toString()", "core"],
        ["value.toString();", ".toString()", "service"],
        ["n.toFixed(2);", ".toFixed()", "core"],
        ["s.toUpperCase();", ".toUpperCase()", "core"],
        ["n.toLocaleString();", ".toLocaleString()", "service"],
      ] as const
    ).map(([code, what, layer]) => ({
      code,
      filename: `/project/src/${layer}/foo.ts`,
      errors: [
        { messageId: "stringConstruction" as const, data: { what, layer } },
      ],
    })),

    // --- Date: banned in every layer (Temporal only) ---
    ...[
      "/project/src/core/foo.ts",
      "/project/src/service/foo.ts",
      "/project/src/adapter/time.ts",
      "/project/src/infra/clock.ts",
    ].flatMap((filename) =>
      [
        `new Date(iso);`,
        `Date.now();`,
        `Date.UTC(2024, 0, 1);`,
        `const f = (d: Date) => d;`,
        `const D = Date;`,
      ].map((code) => ({
        code,
        filename,
        errors: [{ messageId: "noDate" as const }],
      })),
    ),

    // --- adapter: impure / environment-specific ---
    ...[
      ['import { Pool } from "pg";', "pg"],
      ['import axios from "axios";', "axios"],
      ['import { HttpClient } from "@effect/platform";', "@effect/platform"],
      ['import "side-effect-lib";', "side-effect-lib"],
      ['const m = await import("@scope/lib/deep");', "@scope/lib"],
    ].map(([code, name]) => ({
      code,
      filename: "/project/src/adapter/codec.ts",
      errors: [
        { messageId: "adapterPackageNotAllowed" as const, data: { name } },
      ],
    })),
    {
      code: `import.meta.env.VITE_KEY;`,
      filename: "/project/src/adapter/foo.ts",
      errors: [{ messageId: "adapterImpure", data: { name: "import.meta" } }],
    },
    ...[
      ["d.toLocaleString();", ".toLocaleString()"],
      ['d.toLocaleDateString("ja-JP");', ".toLocaleDateString()"],
      ["s.toLocaleUpperCase();", ".toLocaleUpperCase()"],
      ["a.localeCompare(b);", ".localeCompare()"],
      ["new Intl.NumberFormat();", "Intl.NumberFormat"],
      [
        "Intl.DateTimeFormat().resolvedOptions().timeZone;",
        "Intl.DateTimeFormat",
      ],
      ["new Intl.Collator(undefined);", "Intl.Collator"],
      ["new Intl.PluralRules([]);", "Intl.PluralRules"],
      ['new Intl.DateTimeFormat("ja-JP");', "Intl.DateTimeFormat"],
      [
        'new Intl.DateTimeFormat("ja-JP", { hour: "2-digit" });',
        "Intl.DateTimeFormat",
      ],
    ].map(([code, name]) => ({
      code,
      name: `adapter ambient locale: ${name}`,
      filename: "/project/src/adapter/format.ts",
      errors: [{ messageId: "adapterAmbientLocale" as const }],
    })),
    ...[
      ["fetch(url);", "fetch"],
      ["process.env.API_KEY;", "process"],
      ["performance.now();", "performance"],
      ["localStorage.getItem(k);", "localStorage"],
      ["setTimeout(f, 0);", "setTimeout"],
      ["crypto.randomUUID();", "crypto"],
      ['globalThis["fetch"];', "globalThis"],
      ['Function("return this")();', "Function"],
      ["Math.random();", "Math.random"],
      ["Temporal.Now.instant();", "Temporal.Now"],
    ].map(([code, name]) => ({
      code,
      filename: "/project/src/adapter/foo.ts",
      errors: [{ messageId: "adapterImpure" as const, data: { name } }],
    })),
    ...["node:fs", "fs", "fs/promises", "path"].map((importPath) => ({
      code: `import x from "${importPath}";`,
      filename: "/project/src/adapter/foo.ts",
      errors: [
        { messageId: "adapterNodeBuiltin" as const, data: { importPath } },
      ],
    })),

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
      errors: [{ messageId: "noDate" }],
    },

    // --- Intl in inner layers ---
    {
      code: `new Intl.DateTimeFormat("ja-JP");`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Intl", layer: "core" },
        },
      ],
    },
    {
      code: `Intl.NumberFormat("en");`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Intl", layer: "service" },
        },
      ],
    },

    // --- globalThis bypass in inner layers ---
    {
      code: `const j = globalThis["JSON"];`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "globalThis", layer: "core" },
        },
      ],
    },
    {
      code: `globalThis.String;`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "globalThis", layer: "service" },
        },
      ],
    },

    // --- Function constructor bypass in inner layers ---
    {
      code: `Function("return this")();`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Function", layer: "core" },
        },
      ],
    },
    {
      code: `new Function("return JSON")();`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "encodedGlobal",
          data: { name: "Function", layer: "service" },
        },
      ],
    },

    // --- performance IO global in inner layers ---
    {
      code: `performance.now();`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "ioGlobal",
          data: { name: "performance", layer: "core" },
        },
      ],
    },
    {
      code: `performance.timeOrigin;`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "ioGlobal",
          data: { name: "performance", layer: "service" },
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
      code: `Schema.decodeUnknownEffect(S)(d);`,
      filename: "/project/src/core/foo.ts",
      errors: [
        {
          messageId: "schemaBoundary",
          data: { method: "decodeUnknownEffect", layer: "core" },
        },
      ],
    },
    {
      code: `Schema.encodeResult(S)(d);`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "schemaBoundary",
          data: { method: "encodeResult", layer: "service" },
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

    {
      code: `SchemaParser.decodeUnknownOption(S)(d);`,
      filename: "/project/src/service/foo.ts",
      errors: [
        {
          messageId: "schemaBoundary",
          data: { method: "decodeUnknownOption", layer: "service" },
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
