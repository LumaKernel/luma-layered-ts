# Reactレンダリングルール

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

## 状態管理

`useState`の列挙は直積(Cartesian product)。`loading`, `error`, `data`, `submitting`等を個別の`useState`で持つと、状態空間が指数的に膨張し、到達不能な組み合わせ(`loading && error && data`等)が型上許容される。

XStateを使う。`setup().createMachine()`で状態・遷移・contextを定義し、型は推論される。

```ts
// 悪い: 2^4 = 16状態（大半が不正）
const [loading, setLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);
const [data, setData] = useState<Data | null>(null);
const [submitting, setSubmitting] = useState(false);
```

```ts
// 良い: 到達可能な状態と遷移のみ定義
const fetchMachine = setup({
  types: {
    context: {} as { data: Data | null; error: Error | null },
    events: {} as { type: "FETCH" } | { type: "SUBMIT" } | { type: "RETRY" },
  },
}).createMachine({
  initial: "idle",
  context: { data: null, error: null },
  states: {
    idle: { on: { FETCH: "loading" } },
    loading: {
      invoke: { src: "fetchData", onDone: "loaded", onError: "error" },
    },
    loaded: {
      on: { SUBMIT: "submitting" },
    },
    error: {
      on: { RETRY: "loading" },
    },
    submitting: {
      invoke: { src: "submitData", onDone: "loaded", onError: "error" },
    },
  },
});
```

不正な遷移(`idle`→`submitting`)は定義に存在しないため発生しない。`useMachine(fetchMachine)`で使う。

## containers

componentsとhooksの合成+状態管理層。encoding globals禁止。string解釈全禁止。componentsを組み合わせて機能単位を構成する。状態管理にはXStateを使う。

## pages

hooks, components, containersの合成層。複数のcontainer/componentを組み合わせて画面を構成する。

- 直接のstring抽出禁止
- `app/pages`(Next.js)はこの層に委譲する薄いwiring root。`app/page.tsx`がcomponentsを直接importして合成するのではなく、`ui/pages/`のコンポーネントに委譲する。
