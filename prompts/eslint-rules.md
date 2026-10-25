# ESLint rules

`@luma-layered-ts/eslint-plugin`は4つのルールを提供する。

## `require-layer`

`src/`配下の全ファイルが認識されたレイヤディレクトリに属することを強制する。レイヤ外のファイルは他ルールのチェック対象外になるため、この漏れを防ぐ。

認識されるディレクトリ: `src/{core,service,adapter,infra,ui/{hooks,components,pages},app/}`

例外:
- `src/main.ts`(合成ルート)はレイヤ外でも許容
- テストファイル(`.test.ts`, `.spec.ts`)とStorybook(`.stories.tsx`)は全ルールから除外。フィクスチャ作成のためにレイヤ横断importが必要

## `server`

対象: core, service, adapter, infra

全レイヤでインポート行列を強制。core/serviceでは追加制約:

- encoding globals禁止: `JSON`, `String`, `Number`, `Date`, `Temporal`, `globalThis`, `parseInt`, `parseFloat`, `encodeURIComponent`, `decodeURIComponent`, `encodeURI`, `decodeURI`, `atob`, `btoa`
- IO globals禁止: `fetch`, `Request`, `Response`, `Headers`, `FormData`, `process`
- Schema boundary禁止: `decode*`, `encode*`メソッド
- string解釈メソッド禁止: `split`, `match`, `replace`, `startsWith`, `endsWith`, `substring`, `charAt`, `trim`, `padStart`等。`includes`/`indexOf`/`slice`はArrayにも存在するため型情報なしでは区別不能、除外
- `toString()`は許容(logging)

adapter/infraはインポート行列のみ。encoded representation操作はここで行う。

全レイヤ共通: `@/`エイリアスimportがレイヤディレクトリに解決されない場合は`importNonLayer`エラー。`@/engines/foo`や`@/lib/bar`のようなレイヤ外パスへのimportを検出する。

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

## `next`

対象: src/app/ 配下のNext.js app routerファイル

2つのサブレイヤ:

| サブレイヤ | パス | import可能 | 制約 |
|---|---|---|---|
| `app/api` | `src/app/api/**` | core, service, adapter, infra | インポート行列のみ(サーバー側wiring root) |
| `app/pages` | `src/app/**`(api以外) | core, service, ui/hooks, ui/components, ui/pages | encoding globals禁止、Schema boundary禁止、string解釈禁止(ui/pages相当) |

`app/api`のroute handlerは薄いwiring rootとして、実処理はadapter/infra/serviceに委譲する。
`app/pages`のpage/layoutは薄いwiring rootとして、実UIは`ui/pages`や`ui/components`に委譲する。

## Config

```js
import lumaLayeredTs from "@luma-layered-ts/eslint-plugin";

export default [
  lumaLayeredTs.configs["recommended-next"], // require-layer + server + react + next
];
```

Next.js不使用:

```js
export default [
  lumaLayeredTs.configs.recommended, // require-layer + server + react
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
