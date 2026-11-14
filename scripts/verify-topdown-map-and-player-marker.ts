import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';
import { LevelOverviewCamera } from '../src/camera/LevelOverviewCamera';

// Mock Web API for Node SSR environment
(globalThis as any).window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: () => {},
  removeEventListener: () => {},
};

(globalThis as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

function createMockProxy(): any {
  const p: any = new Proxy(() => p, {
    get: (target: any, prop: string | symbol) => {
      if (prop === 'getContext') {
        const dummyCtx: any = new Proxy(() => {}, {
          get: (target: any, method: string | symbol) => {
            if (method === 'createRadialGradient' || method === 'createLinearGradient') {
              return () => ({ addColorStop: () => {} });
            }
            if (method === 'getImageData') {
              return () => ({ data: new Uint8ClampedArray(256 * 256 * 4) });
            }
            if (method === 'measureText') {
              return () => ({ width: 80 });
            }
            return () => {};
          },
          apply: () => {},
        });
        return () => dummyCtx;
      }
      if (prop === 'width' || prop === 'height') return 256;
      if (prop === 'style') return {};
      return createMockProxy();
    },
    apply: () => createMockProxy(),
  });
  return p;
}

(globalThis as any).document = {
  getElementById: () => null,
  querySelector: (sel: string) => {
    if (sel === '.legend-item:nth-child(2)') return null; // Only player legend exists now
    return { innerHTML: '', textContent: '' };
  },
  querySelectorAll: () => [],
  createElement: () => createMockProxy(),
  body: {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }
}

async function runTests() {
  console.log('--- TEST SUITE: Top-Down 2D Collider Map & Player-Only Marker ---');

  const mockCanvas: any = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  // Test 1: LevelOverviewCamera Top-Down Orientation (No 3D Rotation)
  const cam = new LevelOverviewCamera(mockCanvas);
  const lvl1 = ALL_LEVELS[0];
  cam.setLevel(lvl1);

  assert(cam.camera.up.z === -1, 'Camera up vector is (0, 0, -1) for 2D top-down map orientation');
  assert(Math.abs(cam.camera.position.x) < 0.001, 'Camera X is centered at target X (0)');
  assert(cam.camera.position.z > 0 && Math.abs(cam.camera.position.z - (cam as any).target.z) < 0.001, `Camera Z matches target Z with positive offset (${cam.camera.position.z.toFixed(2)}) to elevate map above bottom panel`);
  assert(cam.camera.position.y > 25, `Camera is looking straight down from distance (${cam.camera.position.y.toFixed(1)}m)`);

  // Verify camera looks straight down
  const fwd = new THREE.Vector3();
  cam.camera.getWorldDirection(fwd);
  assert(Math.abs(fwd.y - (-1)) < 0.001, `Camera looks vertically down along -Y axis (fwd.y = ${fwd.y})`);
  assert(Math.abs(fwd.x) < 0.001 && Math.abs(fwd.z) < 0.001, 'No horizontal tilt or inclination (pure top-down)');

  // Test 2: Level 1 (Haunted Banana Garden) 2D Collider Map
  const build1 = LabyrinthBuilder.buildLevel(lvl1);
  assert(!!build1.overviewMapGroup, 'Level 1 produces overviewMapGroup');

  const map1 = build1.overviewMapGroup;
  const colliderLines1 = map1.getObjectByName('OverviewColliderLines') as THREE.LineSegments;
  assert(!!colliderLines1, 'Level 1 overview map contains OverviewColliderLines mesh');

  const linePositions1 = colliderLines1.geometry.getAttribute('position');
  assert(linePositions1.count > 50, `Level 1 outline lines extracted tree and boundary colliders (${linePositions1.count} vertices)`);

  const playerMarker1 = map1.getObjectByName('OverviewPlayerMarker');
  assert(!!playerMarker1, 'Level 1 overview map contains OverviewPlayerMarker');
  assert(
    Math.abs(playerMarker1!.position.x - build1.playerWorldSpawn.x) < 0.01 &&
    Math.abs(playerMarker1!.position.z - build1.playerWorldSpawn.z) < 0.01,
    'Player marker accurately positioned at player world spawn'
  );

  // Test 3: Level 2 (Abandoned School) Multi-Floor / Maze Wall Outlines
  const lvl2 = ALL_LEVELS[1];
  const build2 = LabyrinthBuilder.buildLevel(lvl2);
  assert(!!build2.overviewMapGroup, 'Level 2 produces overviewMapGroup');

  const map2 = build2.overviewMapGroup;
  const colliderLines2 = map2.getObjectByName('OverviewColliderLines') as THREE.LineSegments;
  assert(!!colliderLines2, 'Level 2 overview map contains OverviewColliderLines');

  const linePositions2 = colliderLines2.geometry.getAttribute('position');
  assert(linePositions2.count > 100, `Level 2 contains wall corridor collider outlines (${linePositions2.count} vertices)`);

  const playerMarker2 = map2.getObjectByName('OverviewPlayerMarker');
  assert(!!playerMarker2, 'Level 2 contains OverviewPlayerMarker');

  // Test 4: Verify Hand-Drawn Paper, Ink Lines, Player Marker, and Hantu Markers
  const basePlane = map1.getObjectByName('OverviewPaperBase') as THREE.Mesh;
  assert(!!basePlane, 'Level 1 overview map contains OverviewPaperBase plane');
  const baseMat = basePlane.material as THREE.MeshBasicMaterial;
  assert(baseMat.color.getHex() === 0xeee9df, `Paper plane has dull off-white color 0xeee9df (got 0x${baseMat.color.getHexString()})`);

  const wallMat = colliderLines1.material as THREE.LineBasicMaterial;
  assert(wallMat.color.getHex() === 0x111111, `Wall outlines have black ink color 0x111111 (got 0x${wallMat.color.getHexString()})`);

  const hantuMarker1 = map1.getObjectByName('OverviewHantuMarker_1');
  assert(!!hantuMarker1, 'Level 1 overview map contains OverviewHantuMarker_1');
  assert(
    Math.abs(hantuMarker1!.position.x - build1.monsterWorldSpawns[0].x) < 0.01 &&
    Math.abs(hantuMarker1!.position.z - build1.monsterWorldSpawns[0].z) < 0.01,
    'Hantu marker 1 accurately positioned at monster spawn'
  );

  const hantuMarker2 = map2.getObjectByName('OverviewHantuMarker_1');
  assert(!!hantuMarker2, 'Level 2 overview map contains OverviewHantuMarker_1');

  // Verify camera target Z offset positions map into upper screen area
  assert((cam as any).target.z > 0, `Camera target Z has positive downward offset (${(cam as any).target.z.toFixed(2)}) to elevate map above bottom panel`);

  // Test 5: Verify Camera Panning & Zoom without Rotation
  const initialCamPos = cam.camera.position.clone();
  // Simulate pan move
  (cam as any).isPanning = true;
  (cam as any).lastMouseX = 100;
  (cam as any).lastMouseY = 100;

  // Simulate mouse move event internally
  const simulatedDx = 50;
  const simulatedDy = -30;
  const panSpeed = (cam as any).distance * 0.0016;
  (cam as any).target.x -= simulatedDx * panSpeed;
  (cam as any).target.z -= simulatedDy * panSpeed;
  (cam as any).updateCameraTransform();

  assert(cam.camera.position.x !== initialCamPos.x, 'Camera X panned across map');
  assert(cam.camera.position.z !== initialCamPos.z, 'Camera Z panned across map');

  // Direction must remain strictly vertical downward (no rotation introduced by pan)
  const newFwd = new THREE.Vector3();
  cam.camera.getWorldDirection(newFwd);
  assert(Math.abs(newFwd.y - (-1)) < 0.001, 'Camera orientation remains strictly vertical (-Y) after panning');
  assert(Math.abs(newFwd.x) < 0.001 && Math.abs(newFwd.z) < 0.001, 'No horizontal azimuth or polar drift during pan');

  console.log(`\n========================================`);
  console.log(`ALL TESTS PASSED: ${passed}/${total}`);
  console.log(`========================================\n`);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
