#!/bin/bash
# ================================
# Phase 7 Step 3 — Output Contract Lock Validation
# ================================

cd /home/runner/workspace/Beta-vsafe1zip/server || exit 1

rm -f server.log

PORT=3000 node index.js >> server.log 2>&1 &
SERVER_PID=$!

for i in $(seq 1 15); do
  if curl -sS http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
    echo "Server ready (attempt $i)"
    break
  fi
  sleep 1
done

API="http://127.0.0.1:3000/api/chat"
USER_ID="00000001-0000-0000-0000-000000000001"
LT="2026-02-10T14:00:00-08:00"

send() {
  local MSG="$1"
  local TURN="$2"
  echo ""
  echo "=== TURN $TURN ==="
  echo "USER: $MSG"
  curl -sS --max-time 30 "$API" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"$USER_ID\",
      \"localTime\": \"$LT\",
      \"messages\": [
        {\"role\": \"user\", \"content\": \"$MSG\"}
      ]
    }" | python3 -c "
import sys, json
try:
  o=json.load(sys.stdin)
  msg=o.get('message','')
  print('TRACE:', msg[:180] + ('...' if len(msg)>180 else ''))
except Exception as e:
  print('ERROR:', e)
"
  sleep 2
}

echo "=============================================="
echo "  PHASE 7 STEP 3 — OUTPUT CONTRACT LOCK"
echo "=============================================="

echo ""
echo "--- TURNS 1-5: STUDIOS RUN ---"
send "Give me a reel concept for Midnight Underwater." 1
send "Now one for Neon Promise, same vibe." 2
send "Make it more cinematic." 3
send "Give me a 6-shot list." 4
send "Now caption + five hashtags." 5

echo ""
echo "--- TURNS 6-7: CONVERSATION PIVOT ---"
send "Actually I feel tired and overwhelmed." 6
send "It's been like this all week." 7

echo ""
echo "--- TURN 8: BACK TO STUDIOS ---"
send "Back to music — play Midnight Underwater." 8

sleep 2

echo ""
echo "================================================"
echo "  PHASE7_CONTRACT LOG CHECK"
echo "================================================"
grep "\[PHASE7_CONTRACT\]" server.log | python3 -c "
import sys, json
for i, line in enumerate(sys.stdin, 1):
    raw = line.strip()
    idx = raw.find('{')
    if idx >= 0:
        try:
            d = json.loads(raw[idx:])
            v = ','.join(d.get('violations',[])) or 'none'
            print(f'  Turn {i}: passed={str(d[\"passed\"]):<6} mode={d[\"primaryMode\"]:<14} move={str(d[\"nextMove\"]):<25} violations={v}')
        except: print(f'  Turn {i}: PARSE ERROR')
" || echo "No PHASE7_CONTRACT logs found"

echo ""
echo "================================================"
echo "  PHASE7_NEXTMOVE LOG CHECK"
echo "================================================"
grep "\[PHASE7_NEXTMOVE\]" server.log | python3 -c "
import sys, json
for i, line in enumerate(sys.stdin, 1):
    raw = line.strip()
    idx = raw.find('{')
    if idx >= 0:
        try:
            d = json.loads(raw[idx:])
            print(f'  Turn {i}: mode={d[\"mode\"]:<14} conf={d[\"confidence\"]:<7} nextMove={d[\"nextMove\"]:<25} cont={d[\"continuity_required\"]}')
        except: print(f'  Turn {i}: PARSE ERROR')
"

echo ""
echo "================================================"
echo "  VIOLATION SUMMARY"
echo "================================================"
echo "  studios_identity_intro: $(grep -c 'studios_identity_intro' server.log)"
echo "  studios_activity_leak:  $(grep -c 'studios_activity_leak' server.log)"
echo "  conversation_music_offer_leak: $(grep -c 'conversation_music_offer_leak' server.log)"
echo "  first_line_reset:       $(grep -c 'first_line_reset' server.log)"
echo "  offer_music occurrences: $(grep -c 'offer_music' server.log)"

kill $SERVER_PID 2>/dev/null
echo ""
echo "=== VALIDATION COMPLETE ==="
