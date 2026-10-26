# luma-layered-ts

JSONはencoded boundary representation。canonical representationはEffect.tsの型システム。境界でのみencode/decodeが許される。

## 浸透方法

1. プロジェクトの`CLAUDE.md`から仕様ファイルを参照
2. `src/<layer>/`ごとの`CLAUDE.md`(init手順で生成)
3. `@luma-layered-ts/eslint-plugin`
4. `@luma-layered-ts/types`
