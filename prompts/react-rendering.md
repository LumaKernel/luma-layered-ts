# React rendering rules

string解釈は中間層で禁止。componentsで`.display()`を呼んで描画するだけ。分岐はtagged union(`_tag`)。

## hooks

domain型を返す。JSX禁止。`.display()`禁止。

## components

末端の描画単位。他のcomponentを合成してページを構成するのはpagesの役割。

- `.display()`でstring取得、そのまま描画
- `.trim()`許容
- `.split()`, `.match()`, `.includes()`, `.replace()`禁止
- 分岐は`_tag`のexhaustive switch。string値による条件分岐禁止。
- `Intl`禁止。locale-awareフォーマットはdomain型の`.display()`で提供する。raw timestamp等のプリミティブを受け取って自分でフォーマットしない。

## containers

componentsとhooksの合成+状態管理層。encoding globals禁止。string解釈全禁止。componentsを組み合わせて機能単位を構成する。

## pages

hooks, components, containersの合成層。複数のcontainer/componentを組み合わせて画面を構成する。

- 直接のstring抽出禁止
- `app/pages`(Next.js)はこの層に委譲する薄いwiring root。`app/page.tsx`がcomponentsを直接importして合成するのではなく、`ui/pages/`のコンポーネントに委譲する。
