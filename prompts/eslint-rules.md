# ESLintルール

`@luma-layered-ts/eslint-plugin`は5つのルールを提供する。

## `require-layer`

`src/`配下の全ファイルが認識されたレイヤディレクトリに属することを強制する。レイヤ外のファイルは他ルールのチェック対象外になるため、この漏れを防ぐ。

認識されるディレクトリ: `src/{core,service,adapter,infra,ui/{hooks,components,containers,pages},app/}`

例外:
- `src/main.ts`(合成ルート)はレイヤ外でも許容
- Next.jsの`src/`直下規約ファイル(`proxy`, `middleware`, `instrumentation`, `instrumentation-client`, `mdx-components`)は対応するapp/レイヤとして扱う(`next`参照)。規約ファイルのために`require-layer`を無効化しない
- テストファイル(`.test.ts`, `.spec.ts`)とStorybook(`.stories.tsx`)はレイヤ制約(require-layer, server, react, next)から除外。フィクスチャ作成のためにレイヤ横断importが必要

## `require-unsafe-dir`

検査を抑制するディレクティブとReact effect hookを`_unsafe_/`配下のファイル以外で禁止する(対象はlayers.md)。effect hookは`react`, `preact/hooks`, `preact/compat`からのimport、`React.useEffect`/`React["useEffect"]`形式のアクセス、分割代入を検出する。クラスコンポーネントのライフサイクルメソッド(`componentDidMount`, `componentDidUpdate`, `componentWillUnmount`, `getSnapshotBeforeUpdate`, 旧`componentWill*`/`UNSAFE_*`)も同じ扱い。

`_unsafe_/`内でもeffect hookは直接呼び出しのみ許可。再export、別名への代入、値としての受け渡しはエラー(`_unsafe_/`の外に生のeffect hookを持ち出せるため)。`export * from "react"`と、Reactのdefault/namespace importへの計算されたプロパティアクセス(`React[key]`)はどこでもエラー。`src/`外やテストファイルも対象。

`/* eslint-disable */`はこのルール自身も抑制できてしまうため、`recommended`系configは`linterOptions.noInlineConfig: true`を設定する。`unsafe-dir` configを`recommended`系の後に置き、`_unsafe_/`配下だけinline configを有効にする(未使用ディレクティブはerror)。`unsafe-dir`を忘れると`_unsafe_/`内のディレクティブも効かず、元のエラーが残る。

## `server`

対象: core, service, adapter, infra

全レイヤでインポート行列を強制。core/serviceでは追加制約:

- encoding globals禁止: `JSON`, `String`, `Number`, `Date`, `Temporal`, `globalThis`, `Function`, `Intl`, `parseInt`, `parseFloat`, `encodeURIComponent`, `decodeURIComponent`, `encodeURI`, `decodeURI`, `atob`, `btoa`
- IO globals禁止: `fetch`, `Request`, `Response`, `Headers`, `FormData`, `process`, `performance`
- Schema boundary禁止: `decode*`, `encode*`メソッド
- string解釈メソッド禁止: `split`, `match`, `replace`, `startsWith`, `endsWith`, `substring`, `charAt`, `trim`, `padStart`等。`includes`/`indexOf`/`slice`はArrayにも存在するため型情報なしでは区別不能、除外
- `toString()`は許容(logging)

adapter/infraはインポート行列のみ。encoded representation操作はここで行う。

全レイヤ共通: `@/`エイリアスimportがレイヤディレクトリに解決されない場合は`importNonLayer`エラー。`@/engines/foo`や`@/lib/bar`のようなレイヤ外パスへのimportを検出する。

## `react`

対象: ui/hooks, ui/components, ui/containers, ui/pages

全UIレイヤ共通:
- インポート行列強制
- encoding globals禁止(serverと同一セット)
- Schema boundary禁止

レイヤ別string制約:

| Layer | string解釈 | `.display()` | `.trim()` | `.toString()` |
|---|---|---|---|---|
| hooks | 全禁止 | - | - | ok |
| components | parse系禁止 | ok | ok | ok |
| containers | 全禁止 | - | - | ok |
| pages | 全禁止 | - | - | ok |

## `next`

対象: src/app/ 配下のNext.js app routerファイルと、Next.jsが`src/`直下に置くことを要求する規約ファイル

2つのサブレイヤ:

| サブレイヤ | パス | import可能 | 制約 |
|---|---|---|---|
| `app/api` | `src/app/api/**`, `src/{proxy,middleware,instrumentation}.*` | core, service, adapter, infra | インポート行列のみ(サーバー側wiring root) |
| `app/pages` | `src/app/**`(api以外), `src/{instrumentation-client,mdx-components}.*` | core, service, ui/hooks, ui/components, ui/containers, ui/pages | encoding globals禁止、Schema boundary禁止、string解釈禁止(ui/pages相当) |

`app/api`のroute handlerは薄いwiring rootとして、実処理はadapter/infra/serviceに委譲する。
`app/pages`のpage/layoutは薄いwiring rootとして、実UIは`ui/pages`や`ui/components`に委譲する。

## 併用推奨ルール

`eslint:recommended`外で、encoding globals禁止の迂回を防ぐために有効化すべきルール。

| ルール | 防ぐ迂回パターン |
|---|---|
| `no-implicit-coercion` | `+str`(`Number(str)`相当)、`!!val`、`""+val`。`disallowTemplateShorthand: true`で`` `${val}` ``も検出 |
| `no-eval` | `eval()`による全制約の回避 |
| `no-new-func` | `new Function("code")`による動的コード生成。`Function`のglobals禁止と併用 |
| `no-new-wrappers` | `new String()`, `new Number()`, `new Boolean()` |
| `eqeqeq` | `==`による暗黙の型強制 |

typescript-eslint(recommended-type-checked外):

| ルール | 防ぐ迂回パターン |
|---|---|
| `@typescript-eslint/restrict-template-expressions` (strict) | `` `${num}` ``による暗黙のString変換。`allowNumber: false`で数値も検出 |
| `@typescript-eslint/restrict-plus-operands` (strict) | `str + num`による暗黙の型強制。`allowNumberAndString: false`で検出 |
| `@typescript-eslint/strict-boolean-expressions` | `if (str)`による暗黙のboolean変換 |
| `@typescript-eslint/no-implied-eval` | `setTimeout("code")`の型情報付き検出 |

`@luma-dev/eslint-plugin-luma-ts`(`recommended` + opt-in):

| ルール | 役割 |
|---|---|
| `luma-ts/no-type-assertion-allow-xstate` (opt-in) | type assertion全禁止。XStateの`{} as T`型プレースホルダのみ許容。XState使用時に有効化 |
| `luma-ts/no-date` (recommended) | `Date`禁止 |
| `luma-ts/no-string` (recommended) | `String`禁止 |
| `luma-ts/prefer-immutable` (recommended) | immutable推奨 |
| `luma-ts/no-as-unknown-as` (recommended) | `as unknown as T`禁止 |
| `luma-ts/no-explicit-return-is` (recommended) | 明示的`is`戻り値禁止（推論に任せる） |
| `luma-ts/no-ts-private` (recommended) | TS private禁止 |
| `luma-ts/require-satisfies-in-tls` (recommended) | template literal stringsでsatisfies要求 |

設定例:

```js
import lumaTs from "@luma-dev/eslint-plugin-luma-ts";

export default [
  lumaTs.configs.recommended,
  {
    rules: {
      // opt-in: XState使用時
      "luma-ts/no-type-assertion-allow-xstate": "error",
      // 迂回防止
      "no-implicit-coercion": ["error", { disallowTemplateShorthand: true }],
      "no-eval": "error",
      "no-new-func": "error",
      "no-new-wrappers": "error",
      "eqeqeq": ["error", "always"],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: false, allowBoolean: false }],
      "@typescript-eslint/restrict-plus-operands": ["error", { allowNumberAndString: false }],
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/no-implied-eval": "error",
    },
  },
];
```

## Config

```js
import lumaLayeredTs from "@luma-layered-ts/eslint-plugin";

export default [
  lumaLayeredTs.configs["recommended-next"], // require-layer + server + react + next + require-unsafe-dir
  lumaLayeredTs.configs["unsafe-dir"],
];
```

Next.js不使用:

```js
export default [
  lumaLayeredTs.configs.recommended, // require-layer + server + react + require-unsafe-dir
  lumaLayeredTs.configs["unsafe-dir"],
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
