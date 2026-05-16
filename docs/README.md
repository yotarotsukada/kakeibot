# docs/

「**過去の決定**」と「**コードに表せない状態**」を保管する場所。

実装の How はコードを正とし、ここには書かない。Why と確定した事実だけを置く。エージェント向けの規約・ドメイン語彙の索引は `.claude/skills/` を、ローカル開発・mock 運用・dev 起動は `README.md` を参照。

## 構成

### `spec/` — プロダクト仕様

- [`product.md`](spec/product.md) — 目的 / Out of Scope / アクター / 認証認可 / ダッシュボード表示ロジック
- [`data-model.md`](spec/data-model.md) — マスタ・トランザクションの構造、文字列マッチング方針
- [`calculation.md`](spec/calculation.md) — 翌月入金 / 端数 / 赤黒 / 立替相殺の決定と式

### `architecture/` — アーキテクチャ

- [`overview.md`](architecture/overview.md) — レイヤ越境ルール / Result 型返却 / 3 軸モック などの主要な決定
- [`tech-choices.md`](architecture/tech-choices.md) — TypeScript / Workers / Valibot / jose 等の採用理由
- [`c4.md`](architecture/c4.md) — C4 モデル（System Context / Container / Component）
