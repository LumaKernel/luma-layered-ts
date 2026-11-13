# ESLint flat config

プラグインがファイルパスからレイヤを検出し、全制約を内部で判定する。レイヤ別overrideは不要。

## Next.jsプロジェクト

```js
import tseslint from "typescript-eslint";
import lumaLayeredTs from "@luma-layered-ts/eslint-plugin";

export default tseslint.config(
  lumaLayeredTs.configs["recommended-next"],
  lumaLayeredTs.configs["unsafe-dir"],
  {
    rules: {
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
    },
  },
);
```

infraが`import "server-only";`を要求されるので`server-only`をdependenciesに入れる。vitestはreact-server条件で動かずimport時に例外になるため、空モジュールへaliasする(`server-only`のexportsは`empty.js`を公開しないので絶対パスで指す):

```ts
// vitest.config.ts
resolve: {
  alias: {
    "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js"),
  },
},
```

## 非Next.jsプロジェクト

```js
import tseslint from "typescript-eslint";
import lumaLayeredTs from "@luma-layered-ts/eslint-plugin";

export default tseslint.config(
  lumaLayeredTs.configs.recommended,
  lumaLayeredTs.configs["unsafe-dir"],
  {
    rules: {
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
    },
  },
);
```

## React不使用

```js
{
  rules: {
    "@luma-layered-ts/react": "off",
  },
}
```
