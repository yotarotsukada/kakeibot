---
name: design-system
description: UIコンポーネントの新規作成・既存改修・スタイル調整・新画面追加時に使う。kakeibotのUI言語「Family Savings Cheer」を提供する。カラートークン（OKLCh / Coral Peach primary、Tailwindプリセット色禁止）、font-numericとタイポスケール、dirty-state-aware UI、PageLayout（max-w-md）/ BottomNav、shadcn運用、Hugeicons統一、モバイルLIFF前提、外部frontend-designプラグインとの役割分担。
---

> "Family Savings Cheer" — 家族で楽しく貯金するための明るく柔らかい UI 言語

kakeibot の UI を実装・拡張するすべての作業のリファレンス。新しいコンポーネントや画面を追加する前にここを読む。

---

## 1. デザイン哲学

### プロダクトコンセプト

LINE 上で家族が日常的に使う家計簿アプリ。「家族で楽しく貯金する」体験を提供する。家計管理は「我慢の記録」ではなく「目標達成の積み重ね」と捉え、UI は希望と前向きさを伝える。

### デザイン原則

1. **柔らかい / 親しみやすい**: 鋭角・濃色・SaaS 的なテンプレート感を避ける。家族のキッチンの朝のような暖かさを。
2. **女性視点を意識**: 家計簿の主担当はパートナーの誰か（多くは女性）であるという統計を踏まえ、押し付けがましさのないトーン。
3. **数字は希望の象徴**: 残高・予算・残りなどの金額数字は「Hero」として明快・大胆に組む。
4. **静かなインタラクション**: 操作可能な要素を常時主張せず、必要なときに静かに現れる UX。
5. **モバイル LIFF 第一**: 最大幅 448px（`max-w-md`）。viewport 内に収まる情報量に留める。

### やってはいけないこと

- 純黒（`#000`）の使用。常に warm gray の墨色（`oklch(0.30 0.02 30)`）を使う。
- 純白の背景。`oklch(0.99 0.005 70)` の暖白を使う。
- 鋭利な直角（`rounded-none`）。最低でも `rounded-xl`。
- 明朝・セリフ書体。家計簿ノート的な渋さは「家族の貯金」のトーンに合わない。
- `→` `←` などの記号文字。代わりに Hugeicons の chevron を使う。
- ボタンを常時表示する UI。状態に応じて動的に出す（dirty-state-aware など）。

---

## 2. カラートークン

すべての色は `app/app.css` の `:root` に CSS 変数として定義されている。コンポーネントから直接ハードコードせず、必ずトークン経由で参照する。

### セマンティックトークン

| トークン | 値 | 用途 |
|--------|----|----|
| `--background` | `oklch(0.97 0.014 70)` | ページ背景。クリーム色（カード白との対比） |
| `--foreground` | `oklch(0.30 0.02 30)` | 本文テキスト。warm dark gray（純黒禁止） |
| `--card` | `oklch(1 0 0)` | カード背景。背景より明るく浮かせる |
| `--primary` | `oklch(0.74 0.13 28)` | Coral Peach。CTA、強調、リンク |
| `--primary-foreground` | `oklch(0.99 0.005 70)` | primary の上に乗る文字色 |
| `--muted` | `oklch(0.96 0.008 60)` | 控えめな背景（フォーム・プレースホルダ等） |
| `--muted-foreground` | `oklch(0.55 0.02 30)` | 補足情報の文字色 |
| `--accent` | `oklch(0.92 0.04 28)` | primary を薄めた帯（ヘッダグラデ等） |
| `--destructive` | `oklch(0.66 0.15 25)` | 警告色。やわらかいレッド（怒らない） |
| `--border` | `oklch(0.93 0.008 60)` | 一般罫線 |
| `--input` | `oklch(0.96 0.008 60)` | 入力フィールド枠 |
| `--ring` | `oklch(0.74 0.13 28)` | フォーカスリング（primary と同色） |

Tailwind では `bg-primary`, `text-foreground`, `border-border` 等として参照する。`bg-blue-500` のような Tailwind プリセット色は **使用禁止**。

### カテゴリパレット

カテゴリを色分けするための 7 色。`app/components/features/wallet/categoryColors.ts` で一元管理。

| Index | 色名 | OKLCh | 印象 |
|-------|-----|------|----|
| 0 | sora 空 | `oklch(0.72 0.10 230)` | 落ち着いた青 |
| 1 | mint 若葉 | `oklch(0.74 0.10 165)` | 清涼な緑 |
| 2 | lavender 藤 | `oklch(0.74 0.10 295)` | やさしい紫 |
| 3 | butter 卵 | `oklch(0.85 0.11 95)` | 明るい黄 |
| 4 | coral 珊瑚 | `oklch(0.74 0.13 25)` | 暖かい赤 |
| 5 | aqua 水 | `oklch(0.78 0.10 200)` | 涼やかな水色 |
| 6 | apricot 杏 | `oklch(0.78 0.11 60)` | 明るい橙 |

`getCategoryColor(index)` を必ず使う。ハードコードした hex は禁止。

### ステータスバッジ用補助色

WalletCard のステータス表示で使用。

- 順調: `bg-emerald-100/70` + `text-emerald-700` + `bg-emerald-500` (dot)
- ペース速め: `bg-amber-100/80` + `text-amber-700` + `bg-amber-500`
- オーバー: `bg-destructive/10` + `text-destructive`

---

## 3. タイポグラフィ

すべて Google Fonts から読み込む。`app/root.tsx` の `links` 関数を参照。

### フォントスタック

| フォントファミリ | 用途 | CSS 変数 |
|----------------|-----|---------|
| Zen Maru Gothic + Nunito | 本文・UI 全般 | `--font-sans` |
| Nunito + Zen Maru Gothic | 見出し・display | `--font-display` |
| Nunito + Zen Maru Gothic | 数字（tabular） | `--font-numeric` |

数字を扱う要素には必ず `.font-numeric` または `font-numeric` Tailwind クラスを付ける。これで `tnum` + `lnum` の OpenType feature が有効になり、桁が揃う。

### タイプスケール（モバイル基準）

| 用途 | クラス | 例 |
|-----|------|-----|
| Hero 数字 | `font-numeric text-[2.5rem] font-extrabold tracking-tight tabular-nums` | 残り金額 ¥13,000 |
| サブ Hero | `font-numeric text-[2rem] font-extrabold tracking-tight tabular-nums` | 予算合計 |
| カード見出し | `text-xs font-medium text-foreground/70` | 財布名 |
| 段落・本文 | `text-sm text-foreground` | 説明文 |
| 補足・ラベル | `text-[11px] text-muted-foreground` | 「使用」「予算」など |
| マイクロ | `text-[10px]` | バッジ内テキスト |

### 通貨表記の作法

- `¥` 記号は数字より一回り小さく（`text-2xl mr-0.5 align-baseline opacity-70`）
- 千の位区切りは `Number.toLocaleString()`
- 超過時は `−¥` プレフィックス（半角ハイフンではなく minus sign `−`）

---

## 4. スペーシング & 角丸

### 角丸

`--radius: 1rem` をベースに、以下のスケールで使い分ける。

| Tailwind | 値 | 用途 |
|---------|----|----|
| `rounded-sm` | 0.6rem | バッジ・チップ |
| `rounded-md` | 0.8rem | input・小さいボタン |
| `rounded-lg` | 1rem | 中サイズの要素 |
| `rounded-2xl` | 1.8rem | 一般カード |
| `rounded-3xl` | 2.2rem | Hero カード（WalletCard 等） |

### コンポーネント間スペース

- ページの上下: `pt-7 pb-8`（PageLayout で固定）
- セクション間: `space-y-5`
- カード内のブロック間: `space-y-3.5` 〜 `space-y-4`
- 行内ギャップ: `gap-2` 〜 `gap-3`

---

## 5. シャドウとレイヤリング

平面的すぎず、ふんわり浮かす程度のシャドウを使う。

```css
/* Hero カード（WalletCard / BudgetOverviewCard） */
shadow-[0_2px_24px_-12px_oklch(0.74_0.13_28_/_0.25)]
/* primary を薄く落としたシャドウで、画面が温かみを帯びる */

/* 一般カード */
shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.10)]

/* ボタン */
shadow-sm
```

**`ring-1` は基本使わない**。Card の default ring も `ring-0` で打ち消す。

---

## 6. アイコン

[@hugeicons/core-free-icons](https://hugeicons.com/) のみ使用。他のアイコンライブラリは禁止。

### サイズ・線の太さ

- BottomNav の icon: `size={22} strokeWidth={1.5 or 2}`
- ボタン内 icon: `size={14} strokeWidth={2.5}`
- chevron など: `size={18} strokeWidth={2}`

### 使い分け（採用済み）

| 用途 | アイコン名 |
|------|---------|
| BottomNav: 家計 | `Coins01Icon` |
| BottomNav: 予算 | `PiggyBankIcon` |
| 月: 前へ | `ArrowLeft02Icon` |
| 月: 次へ | `ArrowRight02Icon` |
| 今月にもどる | `ArrowTurnBackwardIcon` |
| 保存（チェック） | `Tick02Icon` |
| 削除（ゴミ箱） | `Delete02Icon` |
| 追加（プラス） | `PlusSignIcon` |

新たに追加するときは「家族の貯金」のトーンに合うかを基準に選ぶ。極端にギミッキーなアイコン（絵文字風など）は避ける。

---

## 7. インタラクション・パターン

### Dirty-state-aware ボタン

入力可能な要素は **状態が変わったときだけ操作ボタンを出す**。採用例: `CategoryEditRow`。

```tsx
const [value, setValue] = useState(initial);
const isDirty = value !== initial;

<Input value={value} onChange={(e) => setValue(e.target.value)} />
{isDirty && <Button>保存</Button>}
```

理由: ボタンが常時表示だと「何をすればいいか」が曖昧になる。変更があったときだけ出ることで、操作の意図がアイコン単体でも明確になる。

### Active state（`active:scale-95`）

タップ可能な丸ボタン・chevron 等には `active:scale-95` を付ける。LIFF / モバイルではタップ可否のフィードバックが重要。

### Animation

shadcn/ui に同梱の `tw-animate-css` を使う。保存ボタン出現時の例: `animate-in fade-in zoom-in-90 duration-150`。

### フォーカス可視性

`focus-visible:ring-2 focus-visible:ring-ring/30` を必ず付ける。LIFF webview のキーボード操作・ARIA 互換性のため。

---

## 8. レイアウト規約

### `PageLayout`

すべての画面で必ずこのラッパーを使う。

```tsx
<PageLayout>
  {/* page content */}
</PageLayout>
```

- 最大幅: 448px（`max-w-md`）
- 横余白: `px-5`
- 縦余白: `pt-7 pb-8`
- セクション間: `space-y-5`

### `BottomNav`

`root.tsx` で固定配置されており、ページ側で意識する必要はない。ただしページ末尾に高さ分の余白（`pb-20`）が `<main>` に確保されている前提で実装する。

### スクロール

`html { scrollbar-gutter: stable; }` で gutter を予約済み。スクロールバー出現時のレイアウトシフトは発生しない。

---

## 9. コンポーネント分類

### `ui/`（shadcn/ui — 触らない原則）

shadcn CLI で追加したアトミックなコンポーネント（`button.tsx`, `card.tsx`, `input.tsx`, `separator.tsx`）。カスタマイズが必要な場合は **新しいラッパーコンポーネントを作る**。shadcn 生成ファイル本体を編集すると、CLI 更新時に競合する。

### `layout/`

| コンポーネント | 役割 |
|-------------|-----|
| `PageLayout` | 全ページ共通ラッパー |
| `BottomNav` | 画面下部のグローバルナビ |

### `features/wallet/`

| コンポーネント | 役割 |
|-------------|-----|
| `WalletCard` | 財布の状況サマリ（通常財布 / 特別財布で共用） |
| `CategoryBudgetRow` | 1 カテゴリの進捗行 |
| `MonthSelector` | 月切り替え（家計 / 予算で共用） |
| `categoryColors.ts` | カテゴリカラー責務 |

`WalletCard` の重要 prop:

- `monthly`（default `true`）: 通常財布は `true`（月単位）、特別財布は `false`（月をまたぐ目標予算）。`false` のとき「今月の」プレフィクスとステータスバッジを出さない。
- `accentColor`: 通常財布は省略（`var(--primary)` を使用）。特別財布など別系統では Coral 以外の色を渡す。

### `features/budget/`

| コンポーネント | 役割 |
|-------------|-----|
| `BudgetOverviewCard` | 予算合計とドーナツチャート |
| `CategoryEditRow` | カテゴリの編集行（dirty-state-aware） |
| `AddCategoryForm` | 新規カテゴリ追加（編集リストの末尾に統合） |

---

## 10. 増築するときのチェックリスト

新しい画面・コンポーネントを追加するときは以下を確認:

- [ ] `PageLayout` でラップしたか
- [ ] 数字には `font-numeric` クラスを付けたか
- [ ] 色は `bg-primary` `text-foreground` 等のトークンを使ったか（Tailwind プリセット色を使っていないか）
- [ ] ハードコードされた hex / oklch 値はないか（カテゴリ色は `getCategoryColor()` 経由か）
- [ ] アイコンは Hugeicons から選んだか
- [ ] 操作要素は dirty-state を考慮したか（常時表示で問題ないか）
- [ ] カードの shadow は本書 §5 に従ったか
- [ ] 純黒 / 純白を使っていないか
- [ ] モバイル幅（448px 以下）で破綻しないか

---

## 11. 外部プラグイン `frontend-design` との役割分担

Claude Code プラグインの `frontend-design` Skill は **汎用的な UI 生成スキル** であり、「Bold maximalism / Refined minimalism / Brutalism / Retro-futuristic …」など任意の Tone を取りうる。kakeibot の **確定済み UI 言語は本 Skill（design-system）**。

運用ルール:

- **既存コンポーネントの改修・小さな調整・規約適用** は本 Skill のみで行う。`frontend-design` は呼ばない。
- **新規実験画面のたたき台が欲しい場合** に限り `frontend-design` でアイデア出ししてよい。ただし最終的に必ず本 Skill のトークン・規約に合わせて再仕上げする（カラートークン、`font-numeric`、PageLayout、Hugeicons など）。
- `frontend-design` の汎用 Tone（純黒・濃色・直角・絵文字風アイコン等）が kakeibot の「Family Savings Cheer」を侵食しないように、提出前のチェックリスト（§10）を必ず通す。
