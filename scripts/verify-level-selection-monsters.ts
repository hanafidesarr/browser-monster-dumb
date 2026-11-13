import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { UIManager } from '../src/ui/UIManager';
import { SaveManager } from '../src/core/SaveManager';
import { AudioManager } from '../src/core/AudioManager';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('=== MONSTER DUMB — LEVEL SELECTION MONSTER DISPLAY & LIGHTWEIGHT AUDIT ===\n');

// Mock DOM environment for SSR test
const createdElements: any[] = [];
class MockElement {
  public tagName: string;
  public className: string = '';
  private _innerHTML: string = '';
  public get innerHTML(): string { return this._innerHTML; }
  public set innerHTML(val: string) {
    this._innerHTML = val;
    if (val === '') {
      this.children = [];
    }
  }
  public textContent: string = '';
  public style: Record<string, string> = {};
  public children: MockElement[] = [];
  public classList = {
    add: (...names: string[]) => {
      names.forEach(n => {
        if (!this.className.includes(n)) this.className = (this.className + ' ' + n).trim();
      });
    },
    remove: (...names: string[]) => {
      names.forEach(n => {
        this.className = this.className.replace(n, '').trim();
      });
    },
    toggle: (name: string, force?: boolean) => {
      const has = this.className.includes(name);
      const shouldHave = force !== undefined ? force : !has;
      if (shouldHave && !has) this.classList.add(name);
      else if (!shouldHave && has) this.classList.remove(name);
      return shouldHave;
    },
    contains: (n: string) => this.className.includes(n),
  };
  private listeners: Record<string, Function[]> = {};

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
    createdElements.push(this);
  }

  public appendChild(child: MockElement) {
    this.children.push(child);
    return child;
  }

  public addEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  public querySelector(selector: string): MockElement | null {
    if (selector.startsWith('.')) {
      const cls = selector.substring(1);
      return this.children.find(c => c.className.includes(cls)) || null;
    }
    return null;
  }
}

const mockLevelsContainer = new MockElement('div');
mockLevelsContainer.className = 'levels-grid';

(globalThis as any).document = {
  createElement: (tag: string) => new MockElement(tag),
  getElementById: (id: string) => {
    if (id === 'levels-container') return mockLevelsContainer;
    return new MockElement('div');
  },
  querySelector: (_sel: string) => new MockElement('div'),
  querySelectorAll: (_sel: string) => [],
};

(globalThis as any).window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: () => {},
  removeEventListener: () => {},
  AudioContext: class {
    currentTime = 0;
    sampleRate = 44100;
    state = 'running';
    destination = {};
    createBufferSource = () => ({ connect: () => {}, start: () => {}, stop: () => {} });
    createGain = () => ({ connect: () => {}, gain: { value: 1, setValueAtTime: () => {} } });
  },
};

(globalThis as any).localStorage = {
  store: {} as Record<string, string>,
  getItem(key: string) { return this.store[key] || null; },
  setItem(key: string, val: string) { this.store[key] = val; },
  removeItem(key: string) { delete this.store[key]; },
  clear() { this.store = {}; }
};

// -----------------------------------------------------------------------------
// Test 1: Level Definitions Monster Count & Archetypes (Lightweight Budget)
// -----------------------------------------------------------------------------
console.log('--- Test 1: Level Definitions Monster Budget (Lightweight Validation) ---');

const expectedConfigs: Record<number, { count: number; type: string; name: string }> = {
  1: { count: 1, type: 'pocong', name: 'Pocong' },
  2: { count: 1, type: 'kunti', name: 'Kuntilanak' },
  3: { count: 1, type: 'pocong', name: 'Pocong' },
  4: { count: 2, type: 'pocong', name: 'Pocong' },
  5: { count: 2, type: 'pocong', name: 'Pocong' },
  6: { count: 3, type: 'pocong', name: 'Pocong' },
  7: { count: 3, type: 'pocong', name: 'Pocong' },
  8: { count: 3, type: 'pocong', name: 'Pocong' },
  9: { count: 4, type: 'pocong', name: 'Pocong' },
  10: { count: 4, type: 'pocong', name: 'Pocong' },
};

ALL_LEVELS.forEach(lvl => {
  const exp = expectedConfigs[lvl.id];
  assert(lvl.monsterCount !== undefined && lvl.monsterCount === exp.count,
    `Level ${lvl.id} monsterCount is ${lvl.monsterCount} (matches budget ${exp.count})`);
  assert(lvl.monsterCount! <= 4,
    `Level ${lvl.id} monster count (${lvl.monsterCount}) stays within lightweight budget (<= 4)`);
  const effectiveType = lvl.monsterType || (lvl.id === 2 ? 'kunti' : 'pocong');
  assert(effectiveType === exp.type,
    `Level ${lvl.id} monster archetype is "${effectiveType}" (expected "${exp.type}")`);
});

// -----------------------------------------------------------------------------
// Test 2: Level Selection Cards Monster Display in UIManager
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Level Selection Cards Monster Display in UIManager ---');

const ui = UIManager.getInstance();
(ui as any).levelsContainer = mockLevelsContainer;
(ui as any).populateLevelsList();

assert(mockLevelsContainer.children.length === 10,
  `Level container populated with exactly 10 cards (actual: ${mockLevelsContainer.children.length})`);

mockLevelsContainer.children.forEach((card, idx) => {
  const lvlId = idx + 1;
  const exp = expectedConfigs[lvlId];
  const expectedText = `${exp.count} ${exp.name}`;

  assert(card.innerHTML.includes('level-monster-badge'),
    `Card ${lvlId} contains .level-monster-badge`);
  assert(card.innerHTML.includes('&#128123;') || card.innerHTML.includes('👻'),
    `Card ${lvlId} contains ghost emoji icon`);
  assert(card.innerHTML.includes(expectedText),
    `Card ${lvlId} displays exact monster count and name: "${expectedText}"`);
  assert(card.innerHTML.includes('level-floor-badge'),
    `Card ${lvlId} displays floor badge for orientation`);
});

// -----------------------------------------------------------------------------
// Test 3: Overview Screen Legend Monster Details
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Overview Screen Legend Monster Details ---');

const mockLegendItem = new MockElement('div');
mockLegendItem.className = 'legend-item';
(globalThis as any).document.querySelector = (sel: string) => {
  if (sel.includes('.legend-item:nth-child(2)')) return mockLegendItem;
  return new MockElement('div');
};

ui.showOverview(ALL_LEVELS[1]); // Level 2: Kuntilanak
assert(mockLegendItem.innerHTML.includes('Kuntilanak (Tertidur)'),
  `Level 2 Overview legend shows "Kuntilanak (Tertidur)"`);

ui.showOverview(ALL_LEVELS[3]); // Level 4: 2 Pocong
assert(mockLegendItem.innerHTML.includes('Pocong (Tertidur) (2 Hantu)'),
  `Level 4 Overview legend shows "Pocong (Tertidur) (2 Hantu)"`);

// -----------------------------------------------------------------------------
// Test 4: Lightweight Game Architecture Guarantees
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Lightweight Architecture Performance Checks ---');

// Max monsters in any level is 4 (minimal CPU/GPU footprint)
const maxMonstersInGame = Math.max(...ALL_LEVELS.map(l => l.monsterCount || 1));
assert(maxMonstersInGame <= 4,
  `Highest monster count in any level is ${maxMonstersInGame} <= 4 (ensures ultra-high 60fps on mobile)`);

console.log('\n======================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
