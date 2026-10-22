import { Option } from "effect";

/**
 * TSの`ReadonlyMap`は`get()`が`V | undefined`を返し、ランタイムで`Map`にアップキャスト可能。
 * Inner layerではこのインターフェースを使う。`get()`は`Option<V>`を返す。
 */
export interface StrictReadonlyMap<K, V> {
  readonly size: number;
  get(key: K): Option.Option<V>;
  has(key: K): boolean;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  entries(): IterableIterator<readonly [K, V]>;
  forEach(callbackfn: (value: V, key: K) => void): void;
  [Symbol.iterator](): IterableIterator<readonly [K, V]>;
}

export function toStrictReadonlyMap<K, V>(
  map: ReadonlyMap<K, V>,
): StrictReadonlyMap<K, V> {
  return {
    get size() {
      return map.size;
    },
    get: (key) => Option.fromNullable(map.get(key)),
    has: (key) => map.has(key),
    keys: () => map.keys(),
    values: () => map.values(),
    entries: () =>
      map.entries() as IterableIterator<readonly [K, V]>,
    forEach: (cb) => map.forEach(cb),
    [Symbol.iterator]: () =>
      map.entries() as IterableIterator<readonly [K, V]>,
  };
}
