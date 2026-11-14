#!/bin/zsh
# Colossus Wake launcher for macOS. Double-click this file in Finder.
#
# It starts this folder's local game server if it is not already running, then
# opens the game. It mirrors Play.ps1: it checks the server's health signature
# and this folder's identity, never stops another app, never installs anything
# and never switches to a different save origin.
#
#   Play.command               start if needed, then open the game
#   Play.command --server-only start if needed, do not open a window
#   Play.command --stop        stop the server this launcher started

cd "$(dirname "$0")" || exit 1
GAME_DIR="$(pwd -P)"
PORT="${PORT:-4178}"
MODE="${1:-}"

finish() {
  # Keep the Terminal window readable when something went wrong.
  if [ "$1" -ne 0 ] && [ -t 0 ]; then
    echo
    echo "Press Return to close this window."
    read -r _
  fi
  exit "$1"
}

if ! [[ "$PORT" =~ '^[0-9]+$' ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  echo "PORT must be an integer from 1 to 65535."
  finish 1
fi
URL="http://127.0.0.1:$PORT"
PID_FILE="$GAME_DIR/logs/server-$PORT.pid"

NODE="$(command -v node 2>/dev/null)"
if [ -z "$NODE" ]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$candidate" ]; then NODE="$candidate"; break; fi
  done
fi
if [ -z "$NODE" ]; then
  echo "Node.js was not found, so the game cannot start. Nothing was installed."
  echo "Install Node.js from https://nodejs.org and open Colossus Wake again."
  finish 1
fi
if [ ! -f "$GAME_DIR/server.mjs" ]; then
  echo "server.mjs is missing beside Play.command."
  finish 1
fi

# The same identity server.mjs reports at /health for this exact folder.
EXPECTED_ROOT_ID="$("$NODE" -e "const fs=require('fs'),c=require('crypto');console.log(c.createHash('sha256').update(fs.realpathSync(process.argv[1]).replaceAll(String.fromCharCode(92),'/').toLowerCase()).digest('hex'));" "$GAME_DIR")"
if ! [[ "$EXPECTED_ROOT_ID" =~ '^[a-f0-9]{64}$' ]]; then
  echo "Could not verify the game folder."
  finish 1
fi

# Prints ready, other or missing.
health() {
  local body
  body="$(curl --silent --max-time 2 --noproxy '*' "$URL/health" 2>/dev/null)"
  local code=$?
  if [ $code -eq 0 ] && printf '%s' "$body" | "$NODE" -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const h=JSON.parse(s);process.exit(h.app==='colossus-wake-local'&&h.version===1&&h.rootId===process.argv[1]?0:1);}catch{process.exit(1);}});" "$EXPECTED_ROOT_ID"; then
    echo ready; return
  fi
  # Anything else that answered, or that merely holds the port, is another
  # app. lsof can exit nonzero while still listing the listener, so read its
  # output rather than its status.
  if [ $code -eq 0 ] || [ -n "$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null)" ]; then
    echo other
  else
    echo missing
  fi
}

if [ "$MODE" = "--stop" ]; then
  if [ -f "$PID_FILE" ] && [ "$(health)" = "ready" ]; then
    SERVER_PID="$(cat "$PID_FILE")"
    if [[ "$SERVER_PID" =~ '^[0-9]+$' ]] && ps -p "$SERVER_PID" -o command= 2>/dev/null | grep -q "server.mjs"; then
      kill "$SERVER_PID" && echo "Colossus Wake server stopped."
    else
      echo "The recorded server is no longer running."
    fi
    rm -f "$PID_FILE"
  else
    echo "No Colossus Wake server started by this launcher is running on port $PORT."
  fi
  finish 0
fi

STATE="$(health)"
if [ "$STATE" = "other" ]; then
  echo "Port $PORT is being used by another app or an older game copy."
  echo "Close that app, then open Colossus Wake again. Nothing else was opened or stopped."
  finish 1
fi

if [ "$STATE" != "ready" ]; then
  mkdir -p "$GAME_DIR/logs"
  TAG="$(date +%Y%m%d-%H%M%S)"
  PORT="$PORT" nohup "$NODE" "$GAME_DIR/server.mjs" \
    >"$GAME_DIR/logs/server-$TAG.out.log" 2>"$GAME_DIR/logs/server-$TAG.err.log" </dev/null &
  SERVER_PID=$!
  disown
  echo "$SERVER_PID" >"$PID_FILE"
  echo "Starting Colossus Wake…"
  for attempt in {1..60}; do
    STATE="$(health)"
    [ "$STATE" = "ready" ] && break
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
    sleep 0.25
  done
  if [ "$STATE" != "ready" ]; then
    echo "The game server did not start. Details:"
    cat "$GAME_DIR/logs/server-$TAG.err.log" 2>/dev/null
    rm -f "$PID_FILE"
    finish 1
  fi
fi

if [ "$MODE" = "--server-only" ]; then
  echo "Colossus Wake server is ready at $URL"
  finish 0
fi

# Use the normal browser profile so existing saves at this address stay
# available. Chrome and Edge give the game its own window (a running browser
# receives the request and keeps its profile); any other default browser opens
# the game in a tab.
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="$URL"
else
  open "$URL"
fi
echo "Colossus Wake is open at $URL"
echo "The game server keeps running in the background so the game reopens quickly."
echo "To stop it, run: ./Play.command --stop"
finish 0
