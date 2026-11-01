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
| `Redacted<string>` | `string` | ログに出ない |
| tagged union (`_tag`) | JSON discriminator | switch exhaustiveで網羅性保証 |
| `HashMap` / `StrictReadonlyMap` | `Record<K, V>` | TSの`ReadonlyMap`は不完全。`@luma-layered-ts/types`を使う |
| `Chunk<T>` | `T[]` | |
| `Duration` | milliseconds number | |

## Schema

`src/core/`で定義。core内では`.Type`(canonical)のみ使用。encode/decode(`.Encoded`変換)は`src/adapter/`のみ。

decodeし直す可能性のある文字列表現(保存・送信・URL・キー・テキスト記法を含む)はencoded representation。生成と解釈は対にしてadapterに置く。片方だけをcoreに置かない。`.display()`は人間向けの一方向の出力で、decodeし直さないものに限る。

Zodやio-tsはencoded側しか表現できない。Effect Schemaの双方向変換がこの分離を可能にする。
