# レイヤ

## ディレクトリとインポート規則

| ディレクトリ | import可 | 特徴 |
|---|---|---|
| `src/core/` | 自身のみ | Schema定義のみ。decode/encode禁止。null/undefined禁止(Optionを使う)。副作用なし。 |
| `src/service/` | core | Effect Service/Layer定義。domain型のみ受け渡し。生JSON・生string禁止。 |
| `src/adapter/` | core, service | 境界層。Schema decode/encode、JSON操作、string解釈はここ(とinfra)だけで許可。決定的で実行環境に依存しない純粋な変換に限り、サーバーとクライアントの両方から使う。IO・時刻・乱数・Node.js組み込みは禁止。 |
| `src/infra/` | core, service, adapter | 具象IO実装。DB、HTTP、ファイルシステム。 |
| `src/ui/hooks/` | core, service, adapter | UIロジック。JSX禁止。string操作禁止。クライアント側の入力(URL、storage、ファイル、レスポンス)はadapterの関数でdecodeする。 |
| `src/ui/components/` | core, ui/hooks | 描画専用。`.display()`呼び出し可。string解釈(split/match等)は禁止。 |
| `src/ui/containers/` | core, service, ui/hooks, ui/components | 合成+状態管理。encoding globals禁止。string解釈全禁止。 |
| `src/ui/pages/` | core, service, ui/hooks, ui/components, ui/containers | ページ合成。直接のstring抽出禁止。 |

`src/main.ts`は合成ルート。全レイヤからimport可。

## `_unsafe_/`

検査を抑制するディレクティブ(`eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `istanbul|c8|v8 ignore`, `node:coverage ignore|disable`, `biome-ignore`, `oxlint-disable*`)は`_unsafe_/`ディレクトリ配下のファイルにしか書けない。テストファイルも同じ。
React effect hook(`useEffect`, `useLayoutEffect`, `useInsertionEffect`)の使用も同じ扱い。クラスコンポーネントのライフサイクルメソッドも同じ。React外との同期は`_unsafe_/`内のカスタムhookに閉じ込め、外にはそのhookを公開する。

`_unsafe_/`はそのコードが属するレイヤの中に置く(`src/infra/_unsafe_/`, `src/core/foo/_unsafe_/`)。レイヤの制約はそのまま適用される。抑制が必要な最小限のコードだけを切り出し、型安全なインターフェースで包んで同じレイヤに公開する。

## Next.js app router

| ディレクトリ | import可 | 特徴 |
|---|---|---|
| `src/app/api/**` | core, service, adapter, infra | サーバー側wiring root。実処理はadapter/infra/serviceに委譲。 |
| `src/app/**`(api以外) | core, service, adapter, ui/* | UI側wiring root。実UIはui/pagesに委譲。ui/pages相当の制約。 |

Next.jsが`src/`直下に要求する規約ファイルもwiring root。`proxy`, `middleware`, `instrumentation`はapp/api、`instrumentation-client`, `mdx-components`はapp/pagesと同じ制約。

app/配下は薄いエントリーポイント。ロジックやUI実装を直接書かない。

route handler例(悪い例 → 良い例):

悪い: route.ts内でリクエスト解析、バリデーション、ビジネスロジック、DB操作を全てインライン実装。
良い: route.tsは各レイヤの関数を呼び出すだけ。

```
route.ts (app/api):
  const input = adapter.parseRequest(request)  // adapter: リクエスト解析
  const result = await service.processMove(input)  // service: ビジネスロジック
  return adapter.toResponse(result)  // adapter: レスポンス構築
```

## インポート行列

行 → 列 をimport可能か。`o` = 可。

```
from \ to     core  svc  adpt  infra  hooks  comp  ctnr  pages
core           o     -    -     -      -      -     -     -
service        o     o    -     -      -      -     -     -
adapter        o     o    o     -      -      -     -     -
infra          o     o    o     o      -      -     -     -
ui/hooks       o     o    o     -      o      -     -     -
ui/components  o     -    -     -      o      o     -     -
ui/containers  o     o    -     -      o      o     o     -
ui/pages       o     o    -     -      o      o     o     o
app/api        o     o    o     o      -      -     -     -
app/pages      o     o    o     -      o      o     o     o
```
