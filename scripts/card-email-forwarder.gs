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
 *   4. 重複転送は処理済みラベル（PROCESSED_LABEL）で防ぐ。
 */

const WORKER_ENDPOINT =
  "https://kakeibot.yotarotsukada.workers.dev/notify/card-email";
const WEBHOOK_TOKEN = "REPLACE_WITH_CARD_EMAIL_WEBHOOK_TOKEN";
const PROCESSED_LABEL = "kakeibot-forwarded";
const GMAIL_QUERY =
  'from:rakuten-card.co.jp subject:カード利用のお知らせ -label:kakeibot-forwarded newer_than:7d';

function forwardCardEmails() {
  const label = getOrCreateLabel_(PROCESSED_LABEL);
  const threads = GmailApp.search(GMAIL_QUERY, 0, 20);
  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const messages = thread.getMessages();
    let allOk = true;
    for (let j = 0; j < messages.length; j++) {
      try {
        postToWorker_(messages[j]);
      } catch (e) {
        Logger.log("転送失敗: " + e);
        allOk = false; // ラベルを付けず次回再試行させる
      }
    }
    if (allOk) thread.addLabel(label);
  }
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

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
