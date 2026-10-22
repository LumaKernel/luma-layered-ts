# ESLint flat config

プラグインがファイルパスからレイヤを検出し、全制約を内部で判定する。レイヤ別overrideは不要。

```js
import tseslint from "typescript-eslint";
import lumaLayeredTs from "@luma-layered-ts/eslint-plugin";

export default tseslint.config(
  lumaLayeredTs.configs.recommended,
  {
    rules: {
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
    },
  },
);
```

React不使用:

```js
{
  rules: {
    "@luma-layered-ts/react": "off",
  },
}
```
