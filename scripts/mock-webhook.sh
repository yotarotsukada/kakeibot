#!/usr/bin/env bash
#
# mock-webhook.sh — Send mock LINE webhook events to the local dev server.
#
# Usage:
#   ./scripts/mock-webhook.sh text         # Send a text message
#   ./scripts/mock-webhook.sh image        # Send an image message
#   ./scripts/mock-webhook.sh text "ランチ 1500円"  # Send custom text
#
# The script computes a valid HMAC-SHA256 signature using the same
# channel secret as in .dev.vars.example (test-channel-secret).
#

set -euo pipefail

# ---- Configuration ----
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:5173/webhook}"
CHANNEL_SECRET="${LINE_CHANNEL_SECRET:-test-channel-secret}"
EVENT_TYPE="${1:-text}"
CUSTOM_TEXT="${2:-}"

# ---- Mock User ID (must match MockStorage pre-populated users) ----
MOCK_USER_ID="U_MOCK_USER_A"

# ---- Build Payload ----
TIMESTAMP=$(date +%s)000
TMP_PAYLOAD=$(mktemp)
trap 'rm -f "$TMP_PAYLOAD"' EXIT

case "$EVENT_TYPE" in
  text)
    MESSAGE_TEXT="${CUSTOM_TEXT:-スーパーで買い物 2500円}"
    cat <<EOF > "$TMP_PAYLOAD"
{
  "destination": "U_BOT_DESTINATION",
  "events": [
    {
      "type": "message",
      "timestamp": ${TIMESTAMP},
      "source": {
        "type": "user",
        "userId": "${MOCK_USER_ID}"
      },
      "replyToken": "mock-reply-token-$(date +%s)",
      "message": {
        "id": "msg-$(date +%s)",
        "type": "text",
        "text": "${MESSAGE_TEXT}"
      }
    }
  ]
}
EOF
    echo "📤 Sending text message: \"${MESSAGE_TEXT}\""
    ;;

  image)
    if [ -n "${2:-}" ] && [ -f "$2" ]; then
      echo "📤 Reading image from: $2"
      B64=$(base64 -i "$2" | tr -d '\n')
      MESSAGE_ID="base64:${B64}"
      echo "📤 Sending actual image message"
    else
      MESSAGE_ID="img-$(date +%s)"
      echo "📤 Sending image message (note: image fetch will fail in mock mode, but the flow is testable)"
    fi
    cat <<EOF > "$TMP_PAYLOAD"
{
  "destination": "U_BOT_DESTINATION",
  "events": [
    {
      "type": "message",
      "timestamp": ${TIMESTAMP},
      "source": {
        "type": "user",
        "userId": "${MOCK_USER_ID}"
      },
      "replyToken": "mock-reply-token-$(date +%s)",
      "message": {
        "id": "${MESSAGE_ID}",
        "type": "image",
        "contentProvider": {
          "type": "line"
        }
      }
    }
  ]
}
EOF
    ;;

  *)
    echo "Usage: $0 [text|image] [optional custom text or image path]"
    echo ""
    echo "Examples:"
    echo "  $0 text                      # Default text message"
    echo "  $0 text 'ランチ 1500円'        # Custom text"
    echo "  $0 image                     # Image message (placeholder)"
    echo "  $0 image ./receipt.jpg       # Actual image message"
    exit 1
    ;;
esac

# ---- Compute HMAC-SHA256 Signature ----
# This matches the verification logic in app/.server/line.ts
SIGNATURE=$(openssl dgst -sha256 -hmac "${CHANNEL_SECRET}" -binary < "$TMP_PAYLOAD" | base64)

echo "🔑 Signature: ${SIGNATURE}"
echo "🌐 Target: ${WEBHOOK_URL}"
echo ""

# ---- Send Request ----
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -H "x-line-signature: ${SIGNATURE}" \
  --data-binary @"${TMP_PAYLOAD}")

# Extract status code (last line) and body (everything else)
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n1)
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')

echo "📥 Response: HTTP ${HTTP_STATUS}"
if [ -n "${HTTP_BODY}" ]; then
  echo "   Body: ${HTTP_BODY}"
fi

# ---- Result ----
if [ "$HTTP_STATUS" = "200" ]; then
  echo ""
  echo "✅ Webhook accepted! Check the server logs for processing output."
else
  echo ""
  echo "❌ Webhook rejected (HTTP ${HTTP_STATUS})"
  exit 1
fi
