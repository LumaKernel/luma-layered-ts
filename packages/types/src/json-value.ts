/** JSON primitive value. */
export type JsonPrimitive = string | number | boolean | null;

/** Mutable JSON object. Adapter/infra layer用。 */
export type JsonObject = { [key: string]: JsonValue };

/** Mutable JSON array. Adapter/infra layer用。 */
export type JsonArray = JsonValue[];

/** Any JSON-representable value (mutable). Adapter/infra layerでの境界操作用。 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/** Deep readonly JSON object. */
export type ReadonlyJsonObject = { readonly [key: string]: ReadonlyJsonValue };

/** Deep readonly JSON array. */
export type ReadonlyJsonArray = readonly ReadonlyJsonValue[];

/** Any JSON-representable value (deep readonly). Inner layerでJSON構造を参照する必要がある場合用。 */
export type ReadonlyJsonValue =
  | JsonPrimitive
  | ReadonlyJsonObject
  | ReadonlyJsonArray;
