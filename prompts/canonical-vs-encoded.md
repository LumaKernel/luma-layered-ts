# Canonical vs Encoded

inner layerの型はcanonical representation。JSON表現はencoded boundary representation。

## 対応

| Canonical (inner layers) | Encoded (boundary) | 備考 |
|---|---|---|
| `Option<T>` | `T \| null` / `T \| undefined` | inner layerでnull/undefinedを直接扱わない |
| `BigDecimal` | `string` (numeric) | 精度を落とさない |
| `Brand<"UserId">` | `string` | |
| `ReadonlyArray<T>` | `T[]` | inner layerではimmutable必須 |
| `Redacted<string>` | `string` | ログに出ない |
| tagged union (`_tag`) | JSON discriminator | switch exhaustiveで網羅性保証 |
| `HashMap` / `StrictReadonlyMap` | `Record<K, V>` | TSの`ReadonlyMap`は不完全。`@luma-layered-ts/types`を使う |
| `Chunk<T>` | `T[]` | |
| `DisplayText` | (表示のみ) | 表示用の一方向の出力。adapterの書式化関数だけが`DisplayText.make`で作る。decode・比較・解釈しない |

## 時刻

`Date`は全レイヤで禁止。canonicalな値はEffectのデータ型(`Equal`/`Hash`/`Order`/Schemaを持つ)で表す。Effectが持たない暦の概念は`@luma-layered-ts/types`が同じ性質のデータ型として提供する(計算はTemporal)。Temporalのオブジェクトはcanonicalな型に出さない。

| 概念 | Canonical | Encoded | 提供元 |
|---|---|---|---|
| 瞬間 | `DateTime.Utc` | ISO 8601 string (`Z`) | effect |
| タイムゾーン付き日時 | `DateTime.Zoned` | ISO 8601 + zone | effect |
| タイムゾーン | `DateTime.TimeZone` | IANA ID string | effect |
| 経過時間(固定長) | `Duration` | milliseconds number | effect |
| 現在時刻 | `Clock`サービス | - | effect |
| 暦の期間(長さが日付で変わる) | `Period` | `P1Y2M3W4D` | types |
| 時刻なしの日付 | `PlainDate` | `YYYY-MM-DD` | types |
| 日付なしの時刻 | `PlainTime` | `HH:MM[:SS[.sss]]` | types |
| タイムゾーンなしの日時 | `PlainDateTime` | `YYYY-MM-DDTHH:MM[:SS[.sss]]` | types |
| 年月 | `PlainYearMonth` | `YYYY-MM` | types |
| 月日 | `PlainMonthDay` | `--MM-DD` | types |

- 経過時間と暦の期間は別の型。「1か月」は固定長ではないので`Duration`で表さない
- `PlainDateTime`は`toZoned`/`fromZoned`で`DateTime.Zoned`と相互変換する
- encodedとの変換は各型の`FromString` Schema(adapterで使う)

## 実行環境に依存する出力

ロケール・タイムゾーン・タイムゾーン規則・ICUデータはサーバーとクライアントで異なりうる。これらに依存する出力(表示用の書式化、ゾーン変換)は1つの環境で1回だけ計算し、結果をデータとして運ぶ。両環境で再計算しない(hydration不一致の原因)。

- ロケールとタイムゾーンは入口(app/pages)でリクエスト(`Accept-Language`、cookie、URL)から決め、canonicalな値として下へ渡す。hooksやadapterが`navigator`や実行環境の既定値から取得しない
- タイムゾーンがリクエストから分からない場合(初回訪問)は、クライアントでのみ描画する部分を`_unsafe_/`内のhookに閉じ込め、得たタイムゾーンをcookie等に保存して以後は入口で決める

## Schema

`src/core/`で定義。core内では`.Type`(canonical)のみ使用。encode/decode(`.Encoded`変換)は`src/adapter/`のみ。

decodeし直す可能性のある文字列表現(保存・送信・URL・キー・テキスト記法を含む)はencoded representation。生成と解釈は対にしてadapterに置く。片方だけをcoreに置かない。人間向けの表示テキスト(一方向の出力)もadapterの書式化関数で生成する。core/serviceは文字列を生成しない。

Zodやio-tsはencoded側しか表現できない。Effect Schemaの双方向変換がこの分離を可能にする。
