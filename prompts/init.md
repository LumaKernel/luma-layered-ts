# 導入手順

まず https://github.com/LumaKernel/luma-layered-ts の prompts/ 配下をこのプロジェクトの適切な場所(例: prompts/luma-layered-ts/)にコピーせよ(git cloneしてコピーしてclone先は消す)。配置先はプロジェクトのドキュメント構成に合わせる。

コピーした仕様ファイルをすべて読み、理解した上で以下を実行:

1. src/{core,service,adapter,infra,ui/{hooks,components,pages}}/ を作成
2. 各ディレクトリに CLAUDE.md を配置(layers.mdが正本。そこから3行で要約)
3. 依存関係インストール:
   - effect
   - @luma-layered-ts/types
   - @luma-layered-ts/eslint-plugin (devDependencies)
4. eslint.config.ts を eslint-rules.md + setup/eslint-config.md から生成
5. ルート CLAUDE.md に仕様ファイルの配置先への参照を追記
6. 既存コードをレイヤディレクトリに移動する。`require-layer`ルールが`src/`配下でレイヤ外のファイルを検出する。移動先の判断基準:
   - Schema定義、domain型、純粋ロジック → core
   - Effect Service/Layer定義 → service
   - JSON/string parse、Schema encode/decode → adapter
   - DB/HTTP/ファイルIO → infra
   - React hooks (JSXなし) → ui/hooks
   - React描画コンポーネント → ui/components
   - ページ合成 → ui/pages
7. ESLint実行で全エラーを解消。レイヤ移動によりimport/encoding制約が自動適用される
