#!/usr/bin/env bash
#
# mock-card-email.sh — Send a mock card-utilization email payload to the local dev server.
#
# Usage:
#   ./scripts/mock-card-email.sh honnin      # 本人ご利用分（本会員カード）
#   ./scripts/mock-card-email.sh kazoku      # 家族ご利用分（家族カード）
#
# Env overrides:
#   CARD_EMAIL_URL            target endpoint (default: http://localhost:5173/notify/card-email)
#   CARD_EMAIL_WEBHOOK_TOKEN  shared bearer token (default: test-card-email-token)
#
# Note: in mock mode (USE_MOCK_AI=true) the HTML is ignored and a fixed
# transaction is used; the HTML matters only when testing the real parser.
#

set -euo pipefail

ENDPOINT="${CARD_EMAIL_URL:-http://localhost:5173/notify/card-email}"
TOKEN="${CARD_EMAIL_WEBHOOK_TOKEN:-test-card-email-token}"
VARIANT="${1:-honnin}"

case "$VARIANT" in
  honnin)
    SUBJECT="【楽天カード】カード利用のお知らせ(本人ご利用分)"
    HTML="<html><body><p>楽天カードご利用のお知らせ（本人ご利用分）</p><table><tr><td>■ご利用日</td><td>2026/05/25</td></tr><tr><td>■ご利用先</td><td>ＡＭＡＺＯＮ．ＣＯ．ＪＰ</td></tr><tr><td>■ご利用金額</td><td>1,500 円</td></tr></table></body></html>"
    ;;
  kazoku)
    SUBJECT="【楽天カード】カード利用のお知らせ(家族ご利用分)"
    HTML="<html><body><p>楽天カードご利用のお知らせ（家族ご利用分）</p><table><tr><td>■ご利用日</td><td>2026/05/24</td></tr><tr><td>■ご利用先</td><td>ＳＴＡＲＢＵＣＫＳ</td></tr><tr><td>■ご利用金額</td><td>680 円</td></tr></table></body></html>"
    ;;
  *)
    echo "Usage: $0 [honnin|kazoku]"
    exit 1
    ;;
esac

TMP_PAYLOAD=$(mktemp)
trap 'rm -f "$TMP_PAYLOAD"' EXIT

cat <<EOF > "$TMP_PAYLOAD"
{
  "from": "service@rakuten-card.co.jp",
  "subject": "${SUBJECT}",
  "html": "${HTML}",
  "gmailMessageId": "mock-$(date +%s)"
}
EOF

echo "📤 Sending mock card email (${VARIANT})"
echo "🌐 Target: ${ENDPOINT}"
echo ""

HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  --data-binary @"${TMP_PAYLOAD}")

HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n1)
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')

echo "📥 Response: HTTP ${HTTP_STATUS}"
if [ -n "${HTTP_BODY}" ]; then
  echo "   Body: ${HTTP_BODY}"
fi

if [ "$HTTP_STATUS" = "200" ]; then
  echo ""
  echo "✅ Accepted! Check the server logs for the notify outcome (ignored / matched / notified)."
else
  echo ""
  echo "❌ Rejected (HTTP ${HTTP_STATUS})"
  exit 1
fi
