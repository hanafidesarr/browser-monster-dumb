import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData.ts';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder.ts';
import { MonsterController } from '../src/monster/MonsterController.ts';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding.ts';

// Mock Web Audio & DOM
const dummyGain = {
  gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
  connect: () => {},
  disconnect: () => {},
};

class DummyAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  createGain() { return { ...dummyGain }; }
  createBuffer(_channels: number, length: number, _rate: number) {
    const data = new Float32Array(length);
    return {
      numberOfChannels: _channels,
      length,
      sampleRate: _rate,
      duration: length / _rate,
      getChannelData: () => data,
      copyFromChannel: () => {},
      copyToChannel: () => {},
    };
  }
  createBufferSource() {
    return {
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      loop: false,
      buffer: null,
      playbackRate: { setValueAtTime: () => {} },
    };
  }
  createOscillator() {
    return {
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      type: 'sine',
    };
  }
  createBiquadFilter() {
    return {
      connect: () => {},
      disconnect: () => {},
      frequency: { setValueAtTime: () => {} },
      Q: { setValueAtTime: () => {} },
    };
  }
  decodeAudioData(_buf: any, cb?: any) {
    if (cb) cb({ duration: 1 });
    return Promise.resolve({ duration: 1 });
  }
}

globalThis.window = {
  AudioContext: DummyAudioContext,
} as any;

const dummyGrad = { addColorStop: () => {} };
const dummyCtx: any = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  clearRect: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  fill: () => {},
  arc: () => {},
  ellipse: () => {},
  fillText: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  scale: () => {},
  bezierCurveTo: () => {},
  quadraticCurveTo: () => {},
  closePath: () => {},
  createRadialGradient: () => dummyGrad,
  createLinearGradient: () => dummyGrad,
};
const dummyCanvas: any = {
  width: 128,
  height: 128,
  getContext: () => dummyCtx,
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') return { ...dummyCanvas };
    return { ...dummyCanvas };
  },
  createElementNS: (_ns: string, tag: string) => {
    if (tag === 'canvas') return { ...dummyCanvas };
    return { ...dummyCanvas };
  },
} as any;
globalThis.localStorage = { getItem: () => null, setItem: () => {} } as any;

console.log('Testing Monster hit & chase logic for all levels...');
let allPassed = true;

for (const level of ALL_LEVELS) {
  console.log(`\n============================================================`);
  console.log(`Level ${level.id}: ${level.title} (Monster type: ${level.monsterType || 'pocong'})`);
  console.log(`============================================================`);

  const build = LabyrinthBuilder.buildLevel(level);
  const navGrid = build.navigationGrid || build.updatedGrid || level.grid;
  const pathfinding = new GridPathfinding(navGrid, level.cellSize);
  const monsterSpawns = build.monsterWorldSpawns || [build.monsterWorldSpawn];
  const monsterType = level.monsterType || (level.id === 2 ? 'kunti' : 'pocong');

  // Spawn all monsters for this level
  const monsters: MonsterController[] = [];
  for (let i = 0; i < monsterSpawns.length; i++) {
    const m = new MonsterController(monsterType);
    m.setLevel(level, pathfinding, monsterSpawns[i], build.collisionConfig);
    monsters.push(m);
  }

  // Cross-reference other monsters
  for (let i = 0; i < monsters.length; i++) {
    const others = monsters.filter((_, idx) => idx !== i);
    monsters[i].otherMonsters = others;
  }

  const primaryMonster = monsters[0];
  console.log(`Monster count: ${monsters.length}`);
  console.log(`Primary monster initial pos: (${primaryMonster.position.x.toFixed(2)}, ${primaryMonster.position.y.toFixed(2)}, ${primaryMonster.position.z.toFixed(2)}), state: ${primaryMonster.state}, wallClinging: ${primaryMonster.isWallClinging}`);

  // Position player directly in front of primary monster at 1.5m distance
  const forward = primaryMonster.getForwardVector().negate();
  const playerPos = primaryMonster.position.clone().addScaledVector(forward, 1.5);
  playerPos.y = primaryMonster.baseGroundY + 1.65; // Player standing on floor

  // Check canInteractWithMonster
  const canInteract = primaryMonster.canInteractWithMonster(playerPos, build.blockingMeshes, 0);
  console.log(`✓ canInteractWithMonster: ${canInteract}`);
  if (!canInteract) {
    console.error(`FAIL: canInteractWithMonster returned false on Level ${level.id}`);
    allPassed = false;
  }

  // Check isHitByPlayerSwing
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
  camera.position.copy(playerPos);
  camera.lookAt(primaryMonster.position);
  const playerForward = new THREE.Vector3().subVectors(primaryMonster.position, playerPos).normalize();

  const isHit = primaryMonster.isHitByPlayerSwing(camera, playerPos, playerForward, build.blockingMeshes, 0);
  console.log(`✓ isHitByPlayerSwing: ${isHit}`);
  if (!isHit) {
    console.error(`FAIL: isHitByPlayerSwing returned false on Level ${level.id}`);
    allPassed = false;
  }

  // Trigger weapon hit
  const dummyWeapon = {
    id: 'baseball_bat',
    nameId: 'Tongkat Baseball',
    impactSound: 'bat_hit',
    swingType: 'melee',
    monsterReaction: 'snap',
  };
  primaryMonster.triggerWeaponHit(dummyWeapon, playerPos);

  // If level has multiple monsters, wake up the others as GameManager does
  for (let i = 1; i < monsters.length; i++) {
    if (!monsters[i].isAwake) {
      monsters[i].wakeUpAndChase(playerPos);
    }
  }

  // Simulate 3.5 seconds of frame updates
  const dt = 1 / 60;
  const initialPositions = monsters.map(m => m.position.clone());
  const enteredChase = new Array(monsters.length).fill(false);
  const moved = new Array(monsters.length).fill(false);

  for (let t = 0; t < 3.5; t += dt) {
    for (let i = 0; i < monsters.length; i++) {
      monsters[i].update(dt, t, playerPos, true);
      if (monsters[i].state === 'CHASE') {
        enteredChase[i] = true;
        const d = monsters[i].position.distanceTo(initialPositions[i]);
        if (d > 0.05) {
          moved[i] = true;
        }
      }
    }
  }

  // Verify primary monster
  console.log(`Primary monster final state: ${primaryMonster.state}, enteredChase: ${enteredChase[0]}, moved: ${moved[0]}`);
  if (!enteredChase[0] || !moved[0]) {
    console.error(`FAIL: Primary monster did not chase/move on Level ${level.id}`);
    allPassed = false;
  }

  // Verify other monsters if multi-monster level
  if (monsters.length > 1) {
    for (let i = 1; i < monsters.length; i++) {
      console.log(`Secondary monster #${i} final state: ${monsters[i].state}, enteredChase: ${enteredChase[i]}, moved: ${moved[i]}`);
      if (!enteredChase[i] || !moved[i]) {
        console.error(`FAIL: Secondary monster #${i} did not chase/move on Level ${level.id}`);
        allPassed = false;
      }
    }
  }
}

if (!allPassed) {
  console.error('\n❌ SOME TESTS FAILED!');
  process.exit(1);
} else {
  console.log('\n✅ ALL 10 LEVELS PASSED HIT & CHASE VERIFICATION SUCCESSFULLY!');
}
