#!/bin/bash
set -e

mkdir -p screenshots
mkdir -p "/Users/hanafidesar/.gemini/antigravity-cli/brain/9c8380c0-f740-4f38-99b7-4804bf720674/screenshots"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TEST_HTML="/Users/hanafidesar/Documents/MYPROJECT/GAME BROWSER/monster-dumb/scripts/render-test-hud.html"

take_shot() {
  local W=$1
  local H=$2
  local HASH=$3
  local OUT_NAME=$4
  echo "Capturing [${W}x${H}] $HASH -> screenshots/$OUT_NAME..."
  rm -rf "/tmp/chrome-shot-$OUT_NAME"
  "$CHROME" \
    --headless=new \
    --no-sandbox \
    --disable-gpu \
    --allow-file-access-from-files \
    --user-data-dir="/tmp/chrome-shot-$OUT_NAME" \
    --window-size="${W},${H}" \
    --screenshot="./screenshots/$OUT_NAME" \
    "file://$TEST_HTML#$HASH" >/dev/null 2>&1
  cp "./screenshots/$OUT_NAME" "/Users/hanafidesar/.gemini/antigravity-cli/brain/9c8380c0-f740-4f38-99b7-4804bf720674/screenshots/$OUT_NAME"
}

# 1. Android Landscape (Google Pixel / Samsung Galaxy standard landscape 915x412) - HUD gameplay
take_shot 915 412 "no_alert" "android_landscape_915x412_hud.png"

# 2. Android Landscape with Single Alert (black background banner)
take_shot 915 412 "with_alert" "single_monster_alert_black_banner.png"

# 3. Android Landscape Standard (Samsung Galaxy 800x360)
take_shot 800 360 "no_alert" "android_landscape_800x360_hud.png"

# 4. Android Portrait (412x915)
take_shot 412 915 "no_alert" "android_portrait_412x915_hud.png"

echo "All Part 3.7 screenshots successfully captured!"
ls -lh screenshots/android_* screenshots/single_*
