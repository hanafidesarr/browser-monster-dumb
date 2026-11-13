#!/bin/bash
set -e

mkdir -p screenshots
mkdir -p "/Users/hanafidesar/.gemini/antigravity-cli/brain/9c8380c0-f740-4f38-99b7-4804bf720674/screenshots"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TEST_HTML="/Users/hanafidesar/Documents/MYPROJECT/GAME BROWSER/monster-dumb/scripts/render-level1-jumpscare.html"

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

# 1. Level 1 Darker Night Banana Garden with Wide Player-Centered Illumination (Landscape 915x412)
take_shot 915 412 "normal" "level1_banana_garden_night_lighting.png"

# 2. Pocong Capture Jumpscare Presentation (Face Close-Up, Glowing Red Eyes, Horror Vignette Overlay)
take_shot 915 412 "jumpscare" "level1_pocong_capture_jumpscare.png"

# 3. Post-Jumpscare Game Over Screen with "COBA LAGI" (Retry)
take_shot 915 412 "game_over" "level1_game_over_retry_screen.png"

# 4. Mobile Portrait Jumpscare View (412x915)
take_shot 412 915 "jumpscare" "level1_jumpscare_portrait_mobile.png"

echo "All Level 1 Polish screenshots captured successfully!"
ls -lh screenshots/level1_*
