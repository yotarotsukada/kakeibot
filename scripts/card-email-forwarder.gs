/**
 * card-email-forwarder.gs — 楽天カード利用速報メールを kakeibot へ転送する Google Apps Script。
 *
 * これはデプロイ対象外の参照用スクリプト。Gmail を読み、未処理の速報メールを
 * Worker の /notify/card-email へ JSON で POST する。MIME 解析や Gmail 認証は
 * GAS 側に閉じ込め、Worker は受け取った HTML を解析するだけにする。
 *
 * 設置手順:
 *   1. https://script.google.com で新規プロジェクトを作成し、このファイルを貼り付ける。
 *   2. WORKER_ENDPOINT / WEBHOOK_TOKEN を環境に合わせて設定する
 *      （WEBHOOK_TOKEN は Worker の CARD_EMAIL_WEBHOOK_TOKEN と同じ値）。
 *   3. トリガー（時間主導型 / 例: 5 分おき）で forwardCardEmails を実行するよう設定する。
 *   4. 重複転送は処理済みメッセージ ID（PropertiesService）でメッセージ単位に防ぐ。
 *      スレッド単位だと、件名が同一でスレッド結合された後続メールが取りこぼされる。
 */

const WORKER_ENDPOINT =
  "https://kakeibot.yotarotsukada.workers.dev/notify/card-email";
const WEBHOOK_TOKEN = "REPLACE_WITH_CARD_EMAIL_WEBHOOK_TOKEN";
const GMAIL_QUERY =
  'from:rakuten-card.co.jp subject:カード利用のお知らせ newer_than:7d';

// 転送済みメッセージ ID を記録するキーと保持期間（クエリ窓より長く取る）。
const PROCESSED_PROP_KEY = "kakeibot_forwarded_ids";
const PROCESSED_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function forwardCardEmails() {
  const processed = loadProcessed_();
  const threads = GmailApp.search(GMAIL_QUERY, 0, 20);
  for (let i = 0; i < threads.length; i++) {
    const messages = threads[i].getMessages();
    for (let j = 0; j < messages.length; j++) {
      const message = messages[j];
      const id = message.getId();
      if (processed[id]) continue; // メッセージ単位で重複転送を防ぐ
      try {
        postToWorker_(message);
        processed[id] = Date.now(); // 成功したメッセージだけ記録（失敗は次回再試行）
      } catch (e) {
        Logger.log("転送失敗 (" + id + "): " + e);
      }
    }
  }
  saveProcessed_(pruneProcessed_(processed));
}

function loadProcessed_() {
  const raw =
    PropertiesService.getScriptProperties().getProperty(PROCESSED_PROP_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveProcessed_(processed) {
  PropertiesService.getScriptProperties().setProperty(
    PROCESSED_PROP_KEY,
    JSON.stringify(processed),
  );
}

function pruneProcessed_(processed) {
  const cutoff = Date.now() - PROCESSED_TTL_MS;
  const kept = {};
  const ids = Object.keys(processed);
  for (let i = 0; i < ids.length; i++) {
    if (processed[ids[i]] >= cutoff) kept[ids[i]] = processed[ids[i]];
  }
  return kept;
}

function postToWorker_(message) {
  const payload = {
    from: message.getFrom(),
    subject: message.getSubject(),
    html: message.getBody(),
    gmailMessageId: message.getId(),
  };
  const res = UrlFetchApp.fetch(WORKER_ENDPOINT, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + WEBHOOK_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error("Worker responded " + code + ": " + res.getContentText());
  }
}
