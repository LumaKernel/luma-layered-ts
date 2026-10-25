# Layers

## ディレクトリとインポート規則

| Directory | Can import | 特徴 |
|---|---|---|
| `src/core/` | self | Schema定義のみ。decode/encode禁止。null/undefined禁止(Option使用)。副作用なし。 |
| `src/service/` | core | Effect Service/Layer定義。domain型のみ受け渡し。生JSON・生string禁止。 |
| `src/adapter/` | core, service | 境界層。Schema decode/encode、JSON操作、string解釈はここだけ。 |
| `src/infra/` | core, service, adapter | 具象IO。DB、HTTP、ファイル。 |
| `src/ui/hooks/` | core, service | ロジック。JSX禁止。string操作禁止。 |
| `src/ui/components/` | core, ui/hooks | 描画。`.display()`呼び出し可。string解釈(split/match等)禁止。 |
| `src/ui/containers/` | core, service, ui/hooks, ui/components | 合成+状態管理。encoding globals禁止。string解釈全禁止。 |
| `src/ui/pages/` | core, service, ui/hooks, ui/components, ui/containers | ページ合成。直接のstring抽出禁止。 |

`src/main.ts`は合成ルート。全レイヤからimport可。

## Next.js app router

| Directory | Can import | 特徴 |
|---|---|---|
| `src/app/api/**` | core, service, adapter, infra | サーバー側wiring root。実処理はadapter/infra/serviceに委譲。 |
| `src/app/**`(api以外) | core, service, ui/* | UI側wiring root。実UIはui/pagesに委譲。ui/pages相当の制約。 |

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
ui/hooks       o     o    -     -      o      -     -     -
ui/components  o     -    -     -      o      o     -     -
ui/containers  o     o    -     -      o      o     o     -
ui/pages       o     o    -     -      o      o     o     o
app/api        o     o    o     o      -      -     -     -
app/pages      o     o    -     -      o      o     o     o
```
