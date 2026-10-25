export const LAYER_NAMES = [
  "core",
  "service",
  "adapter",
  "infra",
  "ui/hooks",
  "ui/components",
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
  "ui/hooks": ["core", "service"],
  "ui/components": ["core", "ui/hooks"],
  "ui/pages": ["core", "service", "ui/hooks", "ui/components"],
  // app/ layers are wiring roots (entry points) — not importable by other layers
  "app/api": ["core", "service", "adapter", "infra"],
  "app/pages": ["core", "service", "ui/hooks", "ui/components", "ui/pages"],
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
    /\/src\/(ui\/(?:hooks|components|pages)|core|service|adapter|infra)\//,
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
  "Date",
  "Temporal",
  "globalThis",
  "Function",
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
