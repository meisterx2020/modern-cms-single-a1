# GitHub Webhook 設定手順

## デプロイ完了後の設定

### 1. Vercelデプロイ URL確認
デプロイ完了後、以下のようなURLが取得できます：
```
https://modern-cms-single-a1-xxxx.vercel.app
```

### 2. GitHub C1リポジトリでWebhook設定

#### アクセス先:
https://github.com/meisterx2020/modern-cms-single-c1/settings/hooks

#### 設定内容:
- **Payload URL**: `https://YOUR-APP.vercel.app/api/webhooks/github/tenant1`
- **Content type**: `application/json`
- **Secret**: `d86ee96938d8dd900cd35128106818135887a0de41f4b354aef422427c075e94`

#### イベント選択:
✅ **Just the push event**
✅ **Pull requests** (オプション)

#### 設定後:
- **Active** にチェック
- "Add webhook" クリック

### 3. 動作テスト

#### テスト手順:
1. C1リポジトリの任意のMDXファイルを編集
2. コミット＆プッシュ
3. Webhookが自動発火
4. Vercelアプリでコンテンツ更新確認

#### ログ確認:
- Vercel Functions ログ: Vercel Dashboard → Project → Functions
- GitHub Webhook ログ: Repository Settings → Webhooks → Recent Deliveries

### 4. トラブルシューティング

#### よくあるエラー:
- **401 Unauthorized**: Webhook Secretが間違っている
- **404 Not Found**: Webhook URLが間違っている  
- **500 Internal Server Error**: 環境変数未設定またはTurso接続エラー

#### デバッグ方法:
- Vercel Functions ログを確認
- GitHub Webhook delivery ログを確認
- 手動同期での動作確認: `npx tsx scripts/recursive-sync.ts`

## 完了チェックリスト

- [ ] Vercel デプロイ完了
- [ ] 環境変数設定完了  
- [ ] GitHub Webhook設定完了
- [ ] Webhook動作テスト完了
- [ ] 自動同期確認完了

## Webhook URL例

**本番用**: `https://modern-cms-single-a1-xxxx.vercel.app/api/webhooks/github/tenant1`

**テナントID説明**:
- `tenant1`: シングルテナント版では固定値
- 将来のマルチテナント対応時に使用予定