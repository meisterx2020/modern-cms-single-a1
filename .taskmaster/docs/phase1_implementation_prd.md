# ModernCMS シングルテナント版 Phase 1 実装PRD

## プロジェクト概要

GitHubリポジトリ（C1: modern-cms-single-c1）上のMDXコンテンツをNext.js 15アプリケーション（A1）で配信するシステムを構築する。WebhookによるGitHub→Turso同期機能を実装し、基本的なCMS機能を実現する。

## 前提条件

- Next.js 15 + App Router + TailwindCSS v4 + Shadcn/UI セットアップ済み
- GitHubリポジトリ: https://github.com/meisterx2020/modern-cms-single-c1
- Tursoデータベース作成済み
- tenantId: 固定値（シングルテナント）

## 実装タスク

### 1. データベース環境構築

#### 1.1 Drizzle ORM セットアップ
- `drizzle-orm` と `@libsql/client` のインストール
- `drizzle.config.ts` の設定
- 環境変数の設定（.env.local）

#### 1.2 データベーススキーマ定義
- `contents` テーブル設計
  - `id`, `slug`, `title`, `description`, `content_raw`, `frontmatter`, `status`, `access_level`, `created_at`, `updated_at`
- `settings` テーブル設計
  - `id`, `key`, `value`, `updated_at`
- マイグレーションファイル作成

#### 1.3 データベース接続ライブラリ
- `src/lib/db/index.ts` - データベース接続
- `src/lib/db/schema.ts` - スキーマ定義
- `src/lib/db/queries.ts` - クエリ関数

### 2. GitHub Webhook システム

#### 2.1 Webhook エンドポイント実装
- `/api/webhooks/github/[tenantId]/route.ts` の作成
- GitHub Webhook signature検証
- push/PR merge イベント処理

#### 2.2 GitHub API連携
- リポジトリファイル取得機能
- 差分検知と同期処理
- `src/lib/github-sync.ts` の実装

#### 2.3 コンテンツ同期ロジック
- `contents/*.mdx` ファイルの処理
- `settings/*.json` ファイルの処理
- frontmatter解析とデータベース保存

### 3. MDX処理システム

#### 3.1 MDXパーサー実装
- `gray-matter` によるfrontmatter解析
- MDXコンテンツのHTML変換
- `src/lib/mdx-parser.ts` の作成

#### 3.2 シンタックスハイライト
- `shiki` または `prism-react-renderer` 導入
- コードブロックのスタイリング

#### 3.3 カスタムMDXコンポーネント
- `src/components/mdx/` ディレクトリ作成
- 基本コンポーネント（見出し、リンク、画像等）
- MDXProvider設定

### 4. フロントエンド実装

#### 4.1 動的ルーティング
- `src/app/[...slug]/page.tsx` の実装
- slugベースでのコンテンツ取得
- 404ページ処理

#### 4.2 レイアウトとナビゲーション
- `src/app/layout.tsx` の実装
- ナビゲーションコンポーネント
- settings テーブルからの設定値取得

#### 4.3 コンテンツ表示
- MDXコンテンツのレンダリング
- frontmatterメタデータ表示
- レスポンシブデザイン

### 5. 環境設定とテスト

#### 5.1 環境変数設定
- GitHub Personal Access Token
- Turso接続情報（URL、Auth Token）
- Webhook Secret

#### 5.2 同期テスト
- 手動Webhook送信テスト
- コンテンツ更新→表示確認
- 設定変更→反映確認

#### 5.3 動作確認
- トップページ（index.mdx）表示
- ブログ記事2件の表示
- ナビゲーション動作

## 技術仕様

### 依存パッケージ
```json
{
  "drizzle-orm": "^0.33.0",
  "@libsql/client": "^0.12.0",
  "gray-matter": "^4.0.3",
  "@next/mdx": "^15.0.0",
  "shiki": "^1.0.0",
  "remark": "^15.0.0",
  "rehype": "^13.0.0"
}
```

### ディレクトリ構造
```
src/
├── app/
│   ├── [...slug]/page.tsx
│   ├── api/webhooks/github/[tenantId]/route.ts
│   └── layout.tsx
├── components/
│   ├── mdx/
│   └── ui/
├── lib/
│   ├── db/
│   ├── mdx-parser.ts
│   └── github-sync.ts
└── drizzle/
```

### データベーステーブル設計

#### contents テーブル
- `id: string (primary key)`
- `slug: string (unique)`
- `title: string`
- `description: string`
- `content_raw: text`
- `frontmatter: text (JSON)`
- `status: string (published/draft)`
- `access_level: string (public/private)`
- `created_at: timestamp`
- `updated_at: timestamp`

#### settings テーブル
- `id: string (primary key)`
- `key: string (unique)`
- `value: text (JSON)`
- `updated_at: timestamp`

## 完了条件

1. **コンテンツ表示**: GitHub上のMDXファイルがWebサイトで表示される
2. **同期機能**: コンテンツ更新時にWebhookが発火し、データベースが更新される
3. **設定反映**: navigation.json等の設定ファイルが反映される
4. **基本機能**: トップページとブログ記事2件が正常に表示される

## 非対象（Phase 2以降）

- ステージング環境対応
- ユーザー認証（Clerk）
- 決済機能（Stripe）
- アクセス分析
- SEO最適化
- 画像最適化

## 開発期間

目安: 5-7営業日

## 成果物

- 動作するNext.jsアプリケーション
- Webhook同期システム
- データベーススキーマとマイグレーション
- 環境設定ドキュメント
- 基本的なMDXコンテンツ表示機能