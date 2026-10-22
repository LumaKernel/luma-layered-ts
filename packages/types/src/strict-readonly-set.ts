/**
 * TSの`ReadonlySet`はランタイムで`Set`にアップキャスト可能。
 * Inner layerではこのインターフェースを使う。
 */
export interface StrictReadonlySet<T> {
  readonly size: number;
  has(value: T): boolean;
  keys(): IterableIterator<T>;
  values(): IterableIterator<T>;
  entries(): IterableIterator<readonly [T, T]>;
  forEach(callbackfn: (value: T) => void): void;
  [Symbol.iterator](): IterableIterator<T>;
}

export function toStrictReadonlySet<T>(
  set: ReadonlySet<T>,
): StrictReadonlySet<T> {
  return {
    get size() {
      return set.size;
    },
    has: (value) => set.has(value),
    keys: () => set.keys(),
    values: () => set.values(),
    entries: () =>
      set.entries() as IterableIterator<readonly [T, T]>,
    forEach: (cb) => set.forEach(cb),
    [Symbol.iterator]: () => set.values(),
  };
}
