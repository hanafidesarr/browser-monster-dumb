#!/bin/bash
set -e

mkdir -p screenshots
mkdir -p "/Users/hanafidesar/.gemini/antigravity-cli/brain/9c8380c0-f740-4f38-99b7-4804bf720674/screenshots"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DIST_DIR="/Users/hanafidesar/Documents/MYPROJECT/GAME BROWSER/monster-dumb/dist"

take_shot() {
  local LEVEL=$1
  local VIEW=$2
  local OUT_NAME=$3
  echo "Capturing Level $LEVEL [$VIEW] -> screenshots/$OUT_NAME..."
  "$CHROME" \
    --headless=new \
    --no-sandbox \
    --disable-gpu \
    --allow-file-access-from-files \
    --user-data-dir="/tmp/chrome-shot-$OUT_NAME" \
    --window-size=1280,720 \
    --screenshot="./screenshots/$OUT_NAME" \
    "file://$DIST_DIR/index.html?level=$LEVEL&view=$VIEW&hide_ui=true" >/dev/null 2>&1
  cp "./screenshots/$OUT_NAME" "/Users/hanafidesar/.gemini/antigravity-cli/brain/9c8380c0-f740-4f38-99b7-4804bf720674/screenshots/$OUT_NAME"
}

# 10 Level Screenshots
take_shot 1 overview level1_garden_overview.png
take_shot 2 stairs   level2_school_stairs.png
take_shot 3 bridge   level3_labyrinth_bridge.png
take_shot 4 multifloor level4_hospital_multifloor.png
take_shot 5 bridge   level5_sewer_canal_bridge.png
take_shot 6 multifloor level6_factory_machinery_catwalk.png
take_shot 7 stairs   level7_hotel_atrium_stairs.png
take_shot 8 multifloor level8_subway_platform_tracks.png
take_shot 9 bridge   level9_facility_reactors_bridge.png
take_shot 10 multifloor level10_nightmare_abyss_tiers.png

# Evidence Shots specifically requested
take_shot 4 multifloor evidence_multifloor_layout.png
take_shot 7 stairs     evidence_stairs_connection.png
take_shot 5 bridge     evidence_bridge_fallzone.png

echo "All 13 screenshots successfully captured and saved!"
ls -lh screenshots/
