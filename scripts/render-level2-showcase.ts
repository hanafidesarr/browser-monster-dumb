import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';
import { MonsterController } from '../src/monster/MonsterController';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const badge = document.getElementById('hud-badge') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a211d);
scene.fog = new THREE.FogExp2(0x1a211d, 0.022);

const level2Def = ALL_LEVELS.find((l) => l.id === 2)!;
const buildResult = LabyrinthBuilder.buildLevel(level2Def);
scene.add(buildResult.rootGroup);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);

// Camera presets according to hash
const hash = window.location.hash.replace('#', '') || 'floor1';

if (hash === 'floor1') {
  // Inside Classroom 2 looking toward teacher desk, student desks, and hallway support columns
  camera.position.set(-8.0, 1.65, -24.0);
  camera.lookAt(-8.0, 1.4, -14.0);
  badge.innerHTML = 'LEVEL 2: FLOOR 1 (CLASSROOM & ATRIUM) <span class="hud-badge">SOLID 3D SLAB & SUPPORT PILLARS</span>';
} else if (hash === 'floor2') {
  // Upper floor walkway looking toward science lab & corridor obstacles
  camera.position.set(-6.0, 5.45, -5.0);
  camera.lookAt(8.0, 5.1, -5.0);
  badge.innerHTML = 'LEVEL 2: FLOOR 2 (UPPER MEZZANINE) <span class="hud-badge">CALM AGED TILES & OBSTACLES</span>';
} else if (hash === 'staircase') {
  // Foot of stairs on Floor 0 looking up the 19 steps to the upper landing
  camera.position.set(-16.0, 1.65, -3.8);
  camera.lookAt(-5.7, 3.8, -3.8);
  badge.innerHTML = 'LEVEL 2: STAIRCASE GEOMETRY <span class="hud-badge">19 STEPS, SOLID CARRIAGE & HANDRAILS</span>';
} else if (hash === 'upper_landing') {
  // Upper landing looking down at the stairwell opening and safety railings
  camera.position.set(-3.5, 5.45, -3.8);
  camera.lookAt(-13.3, 3.8, -3.8);
  badge.innerHTML = 'LEVEL 2: UPPER LANDING & BALUSTRADE <span class="hud-badge">SEAMLESS SLAB CONNECTION & OPENING</span>';
} else if (hash === 'kunti_idle') {
  // Show Kuntilanak Merangkak resting in the hallway
  const m = new MonsterController('kunti');
  m.position.set(-8.0, 0, -18.0);
  m.rotationY = 0;
  m.group.position.copy(m.position);
  m.group.rotation.y = m.rotationY;
  m.model.applySittingPosture(0);
  scene.add(m.group);

  camera.position.set(-8.0, 1.2, -21.0);
  camera.lookAt(-8.0, 0.45, -18.0);
  badge.innerHTML = 'LEVEL 2: KUNTILANAK MERANGKAK <span class="hud-badge">RESTING STANCE</span>';
} else if (hash === 'kunti_crawl') {
  // Show Kuntilanak crawling along the school floor toward camera
  const m = new MonsterController('kunti');
  m.position.set(-8.0, 0, -16.0);
  m.rotationY = Math.PI; // facing towards camera
  m.group.position.copy(m.position);
  m.group.rotation.y = m.rotationY;
  m.model.applyCrawl(0.016, 5.16);
  scene.add(m.group);

  camera.position.set(-8.0, 1.0, -19.5);
  camera.lookAt(-8.0, 0.4, -16.0);
  badge.innerHTML = 'LEVEL 2: KUNTILANAK MERANGKAK <span class="hud-badge">CRAWLING CHASE (MENGEJAR MERANGKAK)</span>';
}

function render() {
  renderer.render(scene, camera);
}

// Continuous render loop for animation
function animate() {
  requestAnimationFrame(animate);
  render();
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
});
