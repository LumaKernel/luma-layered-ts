# ESLintルール

`@luma-layered-ts/eslint-plugin`は2つのルールを提供する。各ルールはスコープ内の全レイヤ制約を包括的にチェックする。

## `server`

対象: core, service, adapter, infra

全レイヤでインポート行列を強制。core/serviceでは追加制約:

- encoding globals禁止: `JSON`, `parseInt`, `parseFloat`, `encodeURIComponent`, `decodeURIComponent`, `encodeURI`, `decodeURI`, `atob`, `btoa`
- IO globals禁止: `fetch`, `Request`, `Response`, `Headers`, `FormData`
- Schema boundary禁止: `decode*`, `encode*`メソッド
- string解釈メソッド禁止: `split`, `match`, `replace`, `includes`, `startsWith`, `endsWith`, `indexOf`, `slice`, `substring`, `trim`, `padStart`等
- `toString()`は許容(logging)

adapter/infraはインポート行列のみ。encoded representation操作はここで行う。

## `react`

対象: ui/hooks, ui/components, ui/pages

全UIレイヤ共通:
- インポート行列強制
- encoding globals禁止(serverと同一セット)
- Schema boundary禁止

レイヤ別string制約:

| Layer | string解釈 | `.display()` | `.trim()` | `.toString()` |
|---|---|---|---|---|
| hooks | 全禁止 | - | - | ok |
| components | parse系禁止 | ok | ok | ok |
| pages | 全禁止 | - | - | ok |

## Config

```js
import lumaLayeredTs from "@luma-layered-ts/eslint-plugin";

export default [
  lumaLayeredTs.configs.recommended, // server + react 両方有効
];
```

React不使用のプロジェクトでは`react`を`off`:

```js
{
  rules: {
    "@luma-layered-ts/react": "off",
  },
}
```
