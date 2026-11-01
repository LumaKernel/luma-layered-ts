import { builtinModules } from "node:module";
import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";

export const LAYER_NAMES = [
  "core",
  "service",
  "adapter",
  "infra",
  "ui/hooks",
  "ui/components",
  "ui/containers",
  "ui/pages",
  "app/api",
  "app/pages",
] as const;

export type LayerName = (typeof LAYER_NAMES)[number];

// import行列: 各レイヤがimport可能なレイヤ (自身は常に可)
const allowedImports: Record<LayerName, readonly LayerName[]> = {
  core: [],
  service: ["core"],
  adapter: ["core", "service"],
  infra: ["core", "service", "adapter"],
  // ui/hooks and app/pages decode client-side input (URL, storage, files, responses) via adapter
  "ui/hooks": ["core", "service", "adapter"],
  "ui/components": ["core", "ui/hooks"],
  "ui/containers": ["core", "service", "ui/hooks", "ui/components"],
  "ui/pages": ["core", "service", "ui/hooks", "ui/components", "ui/containers"],
  // app/ layers are wiring roots (entry points) — not importable by other layers
  "app/api": ["core", "service", "adapter", "infra"],
  "app/pages": [
    "core",
    "service",
    "adapter",
    "ui/hooks",
    "ui/components",
    "ui/containers",
    "ui/pages",
  ],
};

// Test and story files are excluded from layer constraint checks.
// They need freedom to import across layers for fixtures and mocking.
export function isTestFile(filePath: string): boolean {
  return /\.(test|spec|stories)\.[^/]+$/.test(filePath);
}

export function getLayerFromPath(filePath: string): LayerName | null {
  // Check app/api before app/pages (more specific first)
  if (filePath.match(/\/src\/app\/api\//)) return "app/api";
  if (filePath.match(/\/src\/app\//)) return "app/pages";

  const match = filePath.match(
    /\/src\/(ui\/(?:hooks|components|containers|pages)|core|service|adapter|infra)\//,
  );
  if (!match) return null;
  return match[1] as LayerName;
}

export function getLayerFromImport(importPath: string): LayerName | null {
  // app/ layers are entry points — they should not be imported by other modules.
  // Check only the standard layers for import resolution.
  for (const layer of LAYER_NAMES) {
    // Skip app/ layers in import resolution — they are not importable
    if (layer === "app/api" || layer === "app/pages") continue;

    if (
      importPath.includes(`/${layer}/`) ||
      importPath.startsWith(`${layer}/`) ||
      importPath === layer
    ) {
      return layer;
    }
    if (importPath.startsWith(`@/${layer}/`) || importPath === `@/${layer}`) {
      return layer;
    }
  }
  return null;
}

export function canImport(from: LayerName, to: LayerName): boolean {
  if (from === to) return true;
  return allowedImports[from].includes(to);
}

// Resolve a relative import path against the importing file's path.
// Returns the resolved path for relative imports, or the original path otherwise.
export function resolveImportPath(
  importPath: string,
  fromFilePath: string,
): string {
  if (!importPath.startsWith(".")) return importPath;
  const fromDir = fromFilePath.replace(/\/[^/]+$/, "");
  const parts = fromDir.split("/");
  for (const segment of importPath.split("/")) {
    if (segment === "..") parts.pop();
    else if (segment !== ".") parts.push(segment);
  }
  return parts.join("/");
}

// Detect project-internal imports via path alias that should resolve to a layer but don't.
// Only checks @/ alias imports — relative imports (./  ../) are assumed same-layer.
export function isNonLayerAliasImport(importPath: string): boolean {
  return importPath.startsWith("@/");
}

// --- Encoded representation restrictions ---

// Globals that interact with encoded representations (serialization, parsing).
// globalThis/Function are included to prevent bypassing restrictions via
// indirect access (globalThis["JSON"], Function("return this")()).
export const ENCODING_GLOBALS = new Set([
  "JSON",
  "String",
  "Number",
  "Temporal",
  "globalThis",
  "Function",
  "Intl",
  "parseInt",
  "parseFloat",
  "encodeURIComponent",
  "decodeURIComponent",
  "encodeURI",
  "decodeURI",
  "atob",
  "btoa",
]);

// IO boundary globals
export const IO_GLOBALS = new Set([
  "fetch",
  "Request",
  "Response",
  "Headers",
  "FormData",
  "process",
  "performance",
]);

// Schema boundary methods (decode/encode = canonical ↔ encoded conversion)
export const SCHEMA_BOUNDARY_METHODS = new Set([
  "decode",
  "decodeSync",
  "decodeUnknown",
  "decodeUnknownSync",
  "decodePromise",
  "encode",
  "encodeSync",
  "encodeUnknown",
  "encodeUnknownSync",
  "encodePromise",
]);

// String interpretation methods (structural access, pattern matching, content inspection).
// Excludes includes/indexOf/lastIndexOf/slice — these exist on Array too and cause
// false positives without type information.
export const STRING_INTERPRETATION_METHODS = new Set([
  "split",
  "match",
  "matchAll",
  "replace",
  "replaceAll",
  "search",
  "startsWith",
  "endsWith",
  "substring",
  "charAt",
  "charCodeAt",
  "codePointAt",
  "normalize",
  "padStart",
  "padEnd",
  "repeat",
  "localeCompare",
  "trim",
  "trimStart",
  "trimEnd",
]);

// --- adapter purity ---
// adapter is imported from both server (infra, app/api) and client (ui/hooks, app/pages),
// so it must be a deterministic codec that runs in any environment.
// Request/Response/Headers/FormData are Web-standard data types and stay allowed.

// IO, environment-specific APIs, and global object access (which would bypass this list)
export const ADAPTER_IMPURE_GLOBALS = new Set([
  "fetch",
  "process",
  "performance",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "caches",
  "document",
  "navigator",
  "location",
  "history",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "BroadcastChannel",
  "Worker",
  "crypto",
  "setTimeout",
  "setInterval",
  "setImmediate",
  "clearTimeout",
  "clearInterval",
  "queueMicrotask",
  "requestAnimationFrame",
  "Buffer",
  "require",
  "__dirname",
  "__filename",
  "globalThis",
  "window",
  "self",
  "global",
  "Function",
  "eval",
]);

// Non-deterministic members: `Math.random`, `Temporal.Now`
export const ADAPTER_IMPURE_MEMBERS: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map([
  ["Math", new Set(["random"])],
  ["Temporal", new Set(["Now"])],
]);

export function isNodeBuiltinImport(importPath: string): boolean {
  return (
    importPath.startsWith("node:") ||
    builtinModules.includes(importPath.split("/")[0])
  );
}

// Methods that silently use the runtime's locale or time zone.
// Locale-aware formatting goes through Intl constructors with an explicit locale.
export const ADAPTER_AMBIENT_LOCALE_METHODS = new Set([
  "toLocaleString",
  "toLocaleDateString",
  "toLocaleTimeString",
  "toLocaleUpperCase",
  "toLocaleLowerCase",
  "localeCompare",
]);

// Intl constructors whose first argument is the locale
export const INTL_LOCALE_CONSTRUCTORS = new Set([
  "DateTimeFormat",
  "NumberFormat",
  "Collator",
  "PluralRules",
  "RelativeTimeFormat",
  "ListFormat",
  "DisplayNames",
  "Segmenter",
  "DurationFormat",
]);

// --- Date ---
// Date is banned in every layer (mutable, local time by default, millisecond-only). Use Temporal.
export const NO_DATE_MESSAGE =
  "'Date' is not allowed in any layer. Use Temporal.";

export function isDateReference(node: TSESTree.Identifier): boolean {
  if (node.name !== "Date") return false;
  const parent = node.parent;
  // obj.Date, { Date: x }, class { Date() {} }, Ns.Date
  if (
    (parent.type === AST_NODE_TYPES.MemberExpression &&
      parent.property === node &&
      !parent.computed) ||
    ((parent.type === AST_NODE_TYPES.Property ||
      parent.type === AST_NODE_TYPES.MethodDefinition ||
      parent.type === AST_NODE_TYPES.PropertyDefinition) &&
      parent.key === node &&
      !parent.computed &&
      !(parent.type === AST_NODE_TYPES.Property && parent.shorthand)) ||
    (parent.type === AST_NODE_TYPES.TSQualifiedName && parent.right === node)
  ) {
    return false;
  }
  return true;
}
