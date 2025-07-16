# ModernCMS シングルテナント版 Phase 1 - PRD（コンテンツ配信機能）

## 1. フェーズ概要

### 1.1 フェーズ目的

Phase 1 では、ModernCMS シングルテナント版において、**GitHub 上の MDX コンテンツを CMS（A1）側で配信できる状態を構築すること**を目的とする。

このフェーズにより、最低限の CMS として機能し、記事の編集 → 公開までの流れを実現する。ユーザー認証や決済、ステージング環境は対象外。

### 1.2 完了条件

- GitHub 上の MDX 記事が表示される
- コンテンツ更新後に PR→ マージ → 本番反映される
- 設定ファイル（site.json 等）も同期され、適用される

---

## 2. 前提

- GitHub リポジトリ（C1）を事前に作成済み
  - リポジトリ名：`modern-cms-single-c1`
  - 以下の内容がすでに格納されている：
    - `contents/index.mdx`（トップページ）
    - `contents/blog/hello-world.mdx`
    - `contents/blog/why-moderncms.mdx`
    - `settings/site.json`, `navigation.json`, 他
    - `.github/moderncms.yml`（同期対象の設定）

---

## 3. 要件

### 3.1 フロントエンド（A1）要件

- Next.js 15 を使用（App Router）
- `[...slug]/page.tsx` による動的ルーティングで記事表示
- `mdx` のパースと HTML 表示
- 記事データは `Turso (mainDB)` の `contents` テーブルから取得
- 設定情報（ナビゲーション等）は `settings` テーブルから取得

### 3.2 GitHub 連携

- C1 から `push` or `PRマージ` された際に Webhook が発火
- Webhook エンドポイント：`/api/webhooks/github/[tenantId]`
- Webhook が `contents/*.mdx`, `settings/*.json` を対象に差分同期
- MDX は `gray-matter` により frontmatter をパースして保存
- JSON ファイルは `settings.key = ファイル名` として保存

### 3.3 データベース（Turso）

- `contents` テーブルに以下カラムが必要：
  - `slug`, `title`, `description`, `content_raw`, `frontmatter`, `status`, `access_level`, `created_at`, `updated_at` など
- `settings` テーブルに `key`, `value`, `updated_at`
- mainDB（本番環境）のみ対象

---

## 4. 非対象（Phase 2 以降で実装）

- ステージング環境（preview ブランチ対応）
- 認証（Clerk）
- 有料コンテンツ（Paywall / Stripe）
- ユーザー管理、注文履歴
- ログ記録やアクセス分析

---

## 5. 開発ステップ（目安：5〜7 営業日）

1. A1 プロジェクト初期化（Next.js + Tailwind）
2. GitHub Webhook 受信エンドポイント作成
3. `contents` / `settings` テーブル定義と Drizzle ORM 設定
4. MDX パーサー実装（`mdx-parser.ts`）
5. [...slug] ルート作成と HTML レンダリング
6. ナビゲーションやサイト名の表示（settings 反映）
7. GitHub→Turso 同期テスト（手動 Webhook でも OK）
8. コンテンツが表示されるか確認

---

## 6. 完了判定チェックリスト

**index.mdx（トップページ）について**：以下の内容で C1 に格納されている記事がトップページとして表示されることも Phase 1 の重要な目標とする：

```mdx
---
title: "Home"
slug: "/home"
date: "2025-07-15"
accessLevel: "public"
status: "published"
description: "トップページです。"
---

# トップページ

これは ModernCMS シングルテナントのトップページです。
```

- ***

## 7. 成果物

- A1 プロジェクト（modern-web）の初期セットアップ一式
- Webhook 同期の動作確認
- `.env.local` の初期構成（Turso、GitHub 関連）
- 表示確認済みの公開ページ 2 件

---

## 8. 技術構成

- Next.js 15
- TailwindCSS v4
- Shadcn/UI
