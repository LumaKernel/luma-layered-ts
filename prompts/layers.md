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
| `src/ui/pages/` | core, service, ui/* | 合成。直接のstring抽出禁止。 |

`src/main.ts`は合成ルート。全レイヤからimport可。

## インポート行列

行 → 列 をimport可能か。`o` = 可。

```
from \ to     core  svc  adpt  infra  hooks  comp  pages
core           o     -    -     -      -      -     -
service        o     o    -     -      -      -     -
adapter        o     o    o     -      -      -     -
infra          o     o    o     o      -      -     -
ui/hooks       o     o    -     -      o      -     -
ui/components  o     -    -     -      o      o     -
ui/pages       o     o    -     -      o      o     o
```
