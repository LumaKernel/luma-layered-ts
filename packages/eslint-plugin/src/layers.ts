export const LAYER_NAMES = [
  "core",
  "service",
  "adapter",
  "infra",
  "ui/hooks",
  "ui/components",
  "ui/pages",
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
};

export function getLayerFromPath(filePath: string): LayerName | null {
  const match = filePath.match(
    /\/src\/(ui\/(?:hooks|components|pages)|core|service|adapter|infra)\//,
  );
  if (!match) return null;
  return match[1] as LayerName;
}

export function getLayerFromImport(importPath: string): LayerName | null {
  for (const layer of LAYER_NAMES) {
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

// --- Encoded representation restrictions ---

// Globals that interact with encoded representations (serialization, parsing)
export const ENCODING_GLOBALS = new Set([
  "JSON",
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

// String interpretation methods (structural access, pattern matching, content inspection)
export const STRING_INTERPRETATION_METHODS = new Set([
  "split",
  "match",
  "matchAll",
  "replace",
  "replaceAll",
  "search",
  "includes",
  "startsWith",
  "endsWith",
  "indexOf",
  "lastIndexOf",
  "slice",
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
