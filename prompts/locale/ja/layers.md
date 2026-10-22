# レイヤ

## ディレクトリとインポート規則

| ディレクトリ | import可 | 特徴 |
|---|---|---|
| `src/core/` | 自身のみ | Schema定義のみ。decode/encode禁止。null/undefined禁止(Optionを使う)。副作用なし。 |
| `src/service/` | core | Effect Service/Layer定義。domain型のみ受け渡し。生JSON・生string禁止。 |
| `src/adapter/` | core, service | 境界層。Schema decode/encode、JSON操作、string解釈はここだけで許可。 |
| `src/infra/` | core, service, adapter | 具象IO実装。DB、HTTP、ファイルシステム。 |
| `src/ui/hooks/` | core, service | UIロジック。JSX禁止。string操作禁止。 |
| `src/ui/components/` | core, ui/hooks | 描画専用。`.display()`呼び出し可。string解釈(split/match等)は禁止。 |
| `src/ui/pages/` | core, service, ui/* | ページ合成。直接のstring抽出禁止。 |

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
