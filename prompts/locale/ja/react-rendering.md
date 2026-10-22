# Reactレンダリングルール

string解釈は中間層で禁止。componentsで`.display()`を呼んで描画するだけ。分岐はtagged union(`_tag`)。

## hooks

domain型を返す。JSX禁止。`.display()`禁止。

## components

- `.display()`でstring取得、そのまま描画
- `.trim()`許容
- `.split()`, `.match()`, `.includes()`, `.replace()`禁止
- 分岐は`_tag`のexhaustive switch。string値による条件分岐禁止。

## pages

hooksとcomponentsの合成。直接のstring抽出禁止。
