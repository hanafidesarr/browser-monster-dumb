# MONSTER DUMB — PS1 Retro 3D Horror Escape Game

A complete, playable, browser-based 3D survival horror game inspired by classic PlayStation 1 survival horror titles (Silent Hill, Resident Evil). Built with Three.js and Vite.

---

## 🎮 Game Concept & Gameplay Loop

1. **Pre-Game Interactive 3D Overview**:
   - Inspect the real 3D labyrinth from above with an interactive camera.
   - Synchronized markers highlight:
     - 🔵 **Player Spawn** (with facing orientation)
     - 🔴 **Monster** (sitting motionless in its chamber)
     - 🟢 **Exit Door** (escape goal)
   - Freely pan, rotate, and zoom before entering.

2. **Stealth Phase**:
   - Camera performs a smooth cinematic fly-down into first-person view.
   - The monster is sitting motionless with a **90-degree forward Field of Vision** (45° on each side).
   - Solid labyrinth walls block line-of-sight. If detected, the monster awakens and catches the player (Game Over).
   - Sneak through corridors and position yourself directly **behind** the monster within baseball bat striking distance.

3. **Baseball Bat Attack**:
   - When rear attack conditions are satisfied, a contextual **ATTACK** prompt appears:
     - **Desktop**: Left Mouse Click `[LMB]`
     - **Mobile**: Large red pulsing button centered on screen
   - Striking the monster's head plays a swing animation, violent bone impact sound, head recoil, bloodcurdling shriek, and stand-up animation.
   - Attack functionality is permanently disabled for that attempt. You cannot fight back during the chase!

4. **Chase & Escape**:
   - The monster enters aggressive pursuit, navigating through labyrinth corridors using dynamic **A\* pathfinding**.
   - Monster speed is faster than player walking speed, but slightly slower than player sprint speed, offering a fair escape opportunity.
   - The **Exit Door** unlocks only after the monster has entered Chase state.
   - Reach the Exit door to complete the level, save your escape time, and unlock the next level!

---

## 🕹️ Controls

### Desktop Controls
| Input | Action |
|---|---|
| **W, A, S, D** | Move Forward / Backward / Strafe |
| **Shift** | Sprint |
| **Mouse** | First-Person Look (Pointer Lock) |
| **Left Click** | Attack (when positioned behind sitting monster) |
| **ESC** | Pause Menu |

#### Desktop Pre-Game Overview Controls
- **Right Mouse Button + Drag**: Pan camera
- **Left Mouse Button + Drag**: Rotate camera
- **Mouse Wheel**: Zoom in / out

---

### Mobile Touchscreen Controls

The game includes two selectable control schemes (configured in Settings and saved to `localStorage`):

#### Mode A: Simple Joystick (Default)
- **Virtual Joystick**: Horizontally centered at 50% screen width near the bottom edge.
  - Small displacement = slow walk
  - Medium displacement = normal walk
  - Full displacement = sprint
- **Camera Look**: Drag anywhere on the upper/right portion of the screen.
- **Contextual Attack Button**: Appears near the **center of the screen** only when behind the sitting monster.
- **Pause**: Top-right button `[||]`.

#### Mode B: Advanced FPS
- **Left Joystick**: Move (Walk)
- **Sprint Button**: Right circular button held to sprint
- **Camera Look**: Drag on right half of screen
- **Contextual Attack Button**: Center screen when attack criteria met

#### Mobile Pre-Game Overview Controls
- **1-Finger Drag**: Pan camera
- **2-Finger Gesture**: Rotate camera
- **Pinch**: Zoom in / out

---

## 🧱 Architecture & File Structure

```
monster-dumb/
├── index.html                   # HTML structure, UI screens, PS1 overlay
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite build settings (relative base: './')
├── src/
│   ├── main.ts                  # Entry point & bootstrap
│   ├── style.css                # PS1 retro CRT scanlines, responsive UI
│   ├── core/
│   │   ├── AudioManager.ts      # Web Audio procedural horror synthesizer & SFX
│   │   ├── GameManager.ts       # Central finite state machine coordinator
│   │   ├── InputManager.ts      # Keyboard, mouse, pointer lock & touch joysticks
│   │   ├── SaveManager.ts       # LocalStorage progress & settings persistence
│   │   └── SettingsManager.ts   # Audio, sensitivity & graphics quality settings
│   ├── camera/
│   │   └── LevelOverviewCamera.ts # 3D overview camera & cinematic transition
│   ├── level/
│   │   ├── LevelData.ts         # 10 levels data-driven grid definitions
│   │   ├── LabyrinthBuilder.ts  # 3D labyrinth geometry, lighting & markers
│   │   └── TextureGenerator.ts  # Procedural PS1 pixelated textures (NearestFilter)
│   ├── monster/
│   │   ├── MonsterController.ts # AI (Stealth FOV, hit reaction, A* chase)
│   │   └── MonsterModel.ts      # Low-poly articulated PS1 horror monster
│   ├── pathfinding/
│   │   └── GridPathfinding.ts   # A* algorithm & Bresenham raycast line-of-sight
│   ├── player/
│   │   ├── FirstPersonController.ts # First-person movement, headbob & sliding wall collision
│   │   └── WeaponController.ts      # Low-poly baseball bat viewmodel & animations
│   └── ui/
│       └── UIManager.ts         # Menus, 10-level select, settings, HUD
```

---

## 🚀 Running Locally

1. Clone or navigate to the repository directory:
   ```bash
   cd monster-dumb
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```
4. Open the displayed URL (e.g. `http://localhost:3000`) in your browser.

---

## 📦 Building and Deploying to GitHub Pages

1. Build the production bundle:
   ```bash
   npm run build
   ```
   This generates the optimized static files in the `dist/` directory.

2. Preview the production build locally:
   ```bash
   npm run preview
   ```

3. Deploying to GitHub Pages:
   - The Vite configuration uses `base: './'`, ensuring all assets load with relative paths on GitHub Pages or any static CDN.
   - You can push the `dist/` folder to the `gh-pages` branch using `gh-pages`:
     ```bash
     npx gh-pages -d dist
     ```
   - Or configure a GitHub Actions workflow to build and publish the `dist` folder.
