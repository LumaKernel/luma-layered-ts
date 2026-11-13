# ESLintルール

`@luma-layered-ts/eslint-plugin`は7つのルールを提供する。

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

## `codec-placement`

`serialize*`, `deserialize*`, `encode*`, `decode*`, `parse*`という名前の関数(関数宣言、関数を代入する変数、メソッド、関数型のinterface/typeメンバ)をadapter/infra以外で定義することを禁止する。prefixの直後は大文字・数字・`_`・終端のみ一致(`parsed`, `decoder`は対象外)。テストファイルは対象外。

`@luma-layered-ts/types`の`DisplayText.make`はadapterでのみ呼べる(名前付きimport、namespace import、分割代入を検出)。表示テキストを作れるのはadapterの書式化関数だけになる。

呼び出し側は検査しない。codecをadapterに置けば、どの層から呼べるかはインポート行列が決める。

## `strict-collection`

型としての`Map`, `Set`, `ReadonlyMap`, `ReadonlySet`を全ファイルで禁止し、`@luma-layered-ts/types`の`StrictReadonlyMap`, `StrictReadonlySet`を使わせる。`Map`/`Set`は可変、`ReadonlyMap`/`ReadonlySet`は可変の型にアップキャストでき、`ReadonlyMap#get`は`V | undefined`を返す。変換は`toStrictReadonlyMap`/`toStrictReadonlySet`。`WeakMap`, `WeakSet`は対応する型がないため、型として書かず、変更するモジュール内の推論されたローカルに留める。`globalThis.`付きも対象。推論された型は対象外。

## `server`

対象: core, service, adapter, infra

`Date`は全レイヤ(server, react, nextの対象すべて)で禁止。型注釈も対象。日時は`Temporal`を使う。`luma-ts/no-date`と重複するが、本プラグイン単体でも強制する。

全レイヤでインポート行列を強制。core/serviceでは追加制約:

- encoding globals禁止: `JSON`, `String`, `Number`, `Temporal`, `globalThis`, `Function`, `Intl`, `parseInt`, `parseFloat`, `encodeURIComponent`, `decodeURIComponent`, `encodeURI`, `decodeURI`, `atob`, `btoa`
- IO globals禁止: `fetch`, `Request`, `Response`, `Headers`, `FormData`, `process`, `performance`
- Schema boundary禁止: effect 4の実行関数 `{decode,encode}[Unknown]{Effect,Exit,Option,Result,Promise,Sync}`。スキーマ定義の`Schema.decode`/`encode`/`decodeTo`/`encodeTo`は対象外
- string解釈メソッド禁止: `split`, `match`, `replace`, `startsWith`, `endsWith`, `substring`, `charAt`, `trim`, `padStart`等。`includes`/`indexOf`/`slice`はArrayにも存在するため型情報なしでは区別不能、除外
- 文字列生成禁止: 補間を含むテンプレートリテラル、文字列リテラルを含む`+`/`+=`、`join`, `toString`, `toFixed`, `toPrecision`, `toExponential`, `toUpperCase`, `toLowerCase`, `toLocale*`。文字列はencodedまたは表示の表現なのでadapterで生成する。補間なしのテンプレートリテラルと文字列リテラル(定数、`_tag`)は許可。型情報なしでは両辺が変数の`+`は区別できず検出しない

adapter/infraはencoded representation操作を行う層。encoding globals・Schema boundary・string解釈は許可。

adapterはサーバー(infra, app/api)とクライアント(ui/hooks, app/pages)の両方からimportされるため、決定的で実行環境に依存しない純粋な変換に限る:
- IO・環境依存のglobals禁止: `fetch`, `process`, `performance`, `localStorage`, `document`, `navigator`, `crypto`, タイマー, `Buffer`, `require`等。迂回防止で`globalThis`, `window`, `self`, `global`, `Function`, `eval`も禁止
- 非決定的な値禁止: `Math.random`, `Temporal.Now`
- 実行環境のロケール・タイムゾーンへの依存禁止: `toLocale*`, `localeCompare`。`Intl`のコンストラクタはロケール必須、`Intl.DateTimeFormat`は`timeZone`必須(変数やspreadで渡すoptionsは静的に検査できないため許可)
- `import.meta`禁止
- Node.js組み込みモジュールのimport禁止(`node:*`, `fs`, `path`等)
- 外部パッケージは許可リストのみ: 既定は`effect`と`@luma-layered-ts/types`。IOを行わないパッケージだけを`server`ルールのオプション`adapterAllowedPackages`に追加する(`["error", { adapterAllowedPackages: ["some-pure-lib"] }]`)。型のみのimportは対象外
- `Request`, `Response`, `Headers`, `FormData`はWeb標準のデータ型として許可

検出できないもの: `Intl`の出力の環境差(Node.jsとブラウザでICUデータが異なる)。canonical-vs-encoded.mdの「実行環境に依存する出力」に従う。

infraはインポート行列のみ。ただしオプション`requireServerOnly: true`で、各ファイル(`_unsafe_/`含む、テスト除く)の最上位に`import "server-only";`を要求する。`recommended-next`はこれを有効にする(app/pagesがinfraをimportできるため。layers.md参照)。`server-only`はreact-server条件の外(素のNode.js、vitest)ではimport時に例外を投げるので、`recommended`では無効。`recommended-next`で`server`ルールのオプションを上書きするときは`requireServerOnly: true`も書く。

全レイヤ共通: `@/`エイリアスimportがレイヤディレクトリに解決されない場合は`importNonLayer`エラー。`@/engines/foo`や`@/lib/bar`のようなレイヤ外パスへのimportを検出する。

## `react`

対象: ui/hooks, ui/components, ui/containers, ui/pages

全UIレイヤ共通:
- インポート行列強制
- encoding globals禁止(serverと同一セット)
- Schema boundary禁止

レイヤ別string制約:

| Layer | string解釈 | `.trim()` | `.toString()` |
|---|---|---|---|
| hooks | 全禁止 | - | ok |
| components | parse系禁止 | ok | ok |
| containers | 全禁止 | - | ok |
| pages | 全禁止 | - | ok |

## `next`

対象: src/app/ 配下のNext.js app routerファイルと、Next.jsが`src/`直下に置くことを要求する規約ファイル

2つのサブレイヤ:

| サブレイヤ | パス | import可能 | 制約 |
|---|---|---|---|
| `app/api` | `src/app/api/**`, `src/{proxy,middleware,instrumentation}.*` | core, service, adapter, infra | インポート行列のみ(サーバー側wiring root) |
| `app/pages` | `src/app/**`(api以外), `src/{instrumentation-client,mdx-components}.*` | core, service, adapter, infra, ui/hooks, ui/components, ui/containers, ui/pages | adapterの関数でroute params等をdecodeする。server componentはinfraからデータを読む。自身はencoding globals禁止、Schema boundary禁止、string解釈禁止(ui/pages相当) |

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
  lumaLayeredTs.configs["recommended-next"], // require-layer + server + react + next + require-unsafe-dir + codec-placement + strict-collection
  lumaLayeredTs.configs["unsafe-dir"],
];
```

Next.js不使用:

```js
export default [
  lumaLayeredTs.configs.recommended, // require-layer + server + react + require-unsafe-dir + codec-placement + strict-collection
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
