#!/bin/bash
set -e

mkdir -p screenshots
mkdir -p "/Users/hanafidesar/.gemini/antigravity-cli/brain/9c8380c0-f740-4f38-99b7-4804bf720674/screenshots"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SHOWCASE_HTML="/Users/hanafidesar/Documents/MYPROJECT/GAME BROWSER/monster-dumb/dist-showcase/index.html"

take_shot() {
  local W=$1
  local H=$2
  local HASH=$3
  local OUT_NAME=$4
  echo "Capturing [${W}x${H}] #$HASH -> screenshots/$OUT_NAME..."
  rm -rf "/tmp/chrome-shot-$OUT_NAME"
  "$CHROME" \
    --headless=new \
    --no-sandbox \
    --use-gl=angle \
    --allow-file-access-from-files \
    --user-data-dir="/tmp/chrome-shot-$OUT_NAME" \
    --window-size="${W},${H}" \
    --screenshot="./screenshots/$OUT_NAME" \
    "file://$SHOWCASE_HTML#$HASH" >/dev/null 2>&1
  cp "./screenshots/$OUT_NAME" "/Users/hanafidesar/.gemini/antigravity-cli/brain/9c8380c0-f740-4f38-99b7-4804bf720674/screenshots/$OUT_NAME"
}

# 1. Floor 1 (Ground Floor Classroom & Atrium, 3D Slab Underside, Pillars, Desks)
take_shot 915 412 "floor1" "level2_floor1_classroom_slab.png"

# 2. Floor 2 (Upper Mezzanine Walkway, Calm Aged Tiles, Lockers, Obstacles)
take_shot 915 412 "floor2" "level2_floor2_mezzanine_walkway.png"

# 3. Staircase Geometry (19 steps, solid concrete carriage, handrails, flush connection)
take_shot 915 412 "staircase" "level2_staircase_alignment.png"

# 4. Upper Landing & Balustrades (3-sided railings, stairwell opening, unobstructed front)
take_shot 915 412 "upper_landing" "level2_upper_landing_opening.png"

# 5. Kuntilanak Merangkak (Resting Stance in Hallway)
take_shot 915 412 "kunti_idle" "level2_kunti_resting_stance.png"

# 6. Kuntilanak Merangkak (Crawling Chase Animation)
take_shot 915 412 "kunti_crawl" "level2_kunti_crawling_chase.png"

echo "All Level 2 Rework screenshots captured successfully!"
ls -lh screenshots/level2_*
