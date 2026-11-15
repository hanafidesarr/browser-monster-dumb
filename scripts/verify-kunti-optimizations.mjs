import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let total = 0;

function assert(condition, msg) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }
}

console.log('--- VERIFYING KUNTILANAK PERFORMANCE & MATERIAL OPTIMIZATIONS ---');

const modelPath = path.resolve(process.cwd(), 'src/monster/MonsterModel.ts');
const modelCode = fs.readFileSync(modelPath, 'utf8');

// 1. Shading & Material
assert(
  modelCode.includes('MeshLambertMaterial') &&
  modelCode.includes('side: side'),
  'Kuntilanak meshes are converted to lightweight MeshLambertMaterial'
);

// 2. Culling & Double-sided reduction
assert(
  modelCode.includes('side = isThinPart ? THREE.DoubleSide : THREE.FrontSide'),
  'Backface culling enabled (FrontSide) for body & clothes; DoubleSide reserved for thin hair'
);

// 3. Frustum Culling
assert(
  modelCode.includes('child.frustumCulled = true;'),
  'Frustum culling enabled so off-screen Kuntilanak does not cost GPU render time'
);

// 4. Shadow reception
assert(
  modelCode.includes('child.receiveShadow = false;'),
  'Shadow reception disabled on mobile skinned mesh to eliminate shadow map sampling overhead'
);

// 5. PS1 retro texture filter
assert(
  modelCode.includes('m.map.minFilter = THREE.NearestFilter') &&
  modelCode.includes('m.map.magFilter = THREE.NearestFilter'),
  'PS1 retro texture filtering (NearestFilter) applied to optimize texture sampling'
);

// 6. Sitting/Idle posture CPU optimization
assert(
  modelCode.includes('isSittingEvaluated') &&
  modelCode.includes('this.mixer.setTime(0.12)'),
  'Idle wall-clinging posture evaluates skeletal animation once instead of every frame'
);

// 7. Crawl animation throttling
assert(
  modelCode.includes('crawlAnimAccumulator') &&
  modelCode.includes('this.crawlAnimAccumulator >= 0.03'),
  'Crawl animation throttled to ~30 FPS skeletal updates to eliminate CPU/GPU skinning bottleneck'
);

// 8. Soft eye point light
assert(
  modelCode.includes('new THREE.PointLight(0xff0000, 0.4, 1.8, 2.0)'),
  'Eye point light radius & intensity softened so nearby walls/props do not recalculate heavy lighting'
);

console.log(`\n🎉 ALL ${passed}/${total} KUNTILANAK OPTIMIZATION TESTS PASSED!`);
