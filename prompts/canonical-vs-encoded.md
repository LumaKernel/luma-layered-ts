# Canonical vs Encoded

inner layerの型はcanonical representation。JSON表現はencoded boundary representation。

## 対応

| Canonical (inner layers) | Encoded (boundary) | 備考 |
|---|---|---|
| `Option<T>` | `T \| null` / `T \| undefined` | inner layerでnull/undefinedを直接扱わない |
| `DateTime.Utc` | ISO 8601 string | `Date`はencoding globals禁止で検出 |
| `BigDecimal` | `string` (numeric) | 精度を落とさない |
| `Brand<"UserId">` | `string` | |
| `ReadonlyArray<T>` | `T[]` | inner layerではimmutable必須 |
| `Redacted<string>` | `string` | |
| tagged union (`_tag`) | JSON discriminator | exhaustive switch |
| `HashMap` / `StrictReadonlyMap` | `Record<K, V>` | TSの`ReadonlyMap`は不完全。`@luma-layered-ts/types`を使う |
| `Chunk<T>` | `T[]` | |
| `Duration` | milliseconds number | |

## Schema

`src/core/`で定義。core内では`.Type`(canonical)のみ使用。encode/decode(`.Encoded`変換)は`src/adapter/`のみ。

Zodやio-tsはencoded側しか表現できない。Effect Schemaの双方向変換がこの分離を可能にする。
