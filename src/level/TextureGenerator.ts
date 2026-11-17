import * as THREE from 'three';

export class TextureGenerator {
  private static setPixelated(texture: THREE.CanvasTexture): THREE.CanvasTexture {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // PS1 Grimy Concrete Wall
  public static createWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base concrete
    ctx.fillStyle = '#555c66';
    ctx.fillRect(0, 0, size, size);

    // Concrete noise
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 35;
        const c = Math.max(55, Math.min(125, 88 + n));
        ctx.fillStyle = `rgb(${c}, ${c + 2}, ${c + 4})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Concrete block seams
    ctx.strokeStyle = '#1e2124';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size / 2);
    ctx.strokeRect(0, size / 2, size, size / 2);
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size / 2);
    ctx.moveTo(size / 4, size / 2);
    ctx.lineTo(size / 4, size);
    ctx.moveTo(3 * size / 4, size / 2);
    ctx.lineTo(3 * size / 4, size);
    ctx.stroke();

    // Dirty stains / water damage / blood specks
    ctx.fillStyle = 'rgba(25, 20, 18, 0.45)';
    ctx.fillRect(0, 0, size, 16);
    ctx.fillRect(0, size - 20, size, 20);

    for (let i = 0; i < 6; i++) {
      const rx = Math.random() * size;
      const ry = Math.random() * size;
      ctx.fillStyle = Math.random() > 0.4 ? 'rgba(60, 20, 15, 0.4)' : 'rgba(20, 25, 20, 0.5)';
      ctx.beginPath();
      ctx.arc(rx, ry, 6 + Math.random() * 12, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // PS1 Weathered Industrial Concrete Slabs (Level 3 — Spacious, calm, no dizzying micro-tiles)
  public static createFloorTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base weathered dark concrete tone
    ctx.fillStyle = '#474c52';
    ctx.fillRect(0, 0, size, size);

    // Large 2x2 concrete floor slabs (spacious 64x64px each)
    const slabSize = size / 2;
    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const isAlt = (tx + ty) % 2 === 0;
        const shade = isAlt ? 72 : 79;
        ctx.fillStyle = `rgb(${shade}, ${shade + 1}, ${shade + 3})`;
        ctx.fillRect(tx * slabSize + 2, ty * slabSize + 2, slabSize - 4, slabSize - 4);

        // Subtle large stone grain (soft tonal gradient, not high-frequency noise)
        const grad = ctx.createLinearGradient(
          tx * slabSize,
          ty * slabSize,
          (tx + 1) * slabSize,
          (ty + 1) * slabSize
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
        ctx.fillStyle = grad;
        ctx.fillRect(tx * slabSize + 2, ty * slabSize + 2, slabSize - 4, slabSize - 4);
      }
    }

    // Clean expansion joint seams between slabs
    ctx.strokeStyle = '#22252a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(slabSize, 0);
    ctx.lineTo(slabSize, size);
    ctx.moveTo(0, slabSize);
    ctx.lineTo(size, slabSize);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // PS1 Ceiling Panels
  public static createCeilingTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3a414a';
    ctx.fillRect(0, 0, size, size);

    // Grid panels
    ctx.strokeStyle = '#22272e';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.strokeRect(10, 10, size - 20, size - 20);

    // Center vent slats
    ctx.fillStyle = '#101114';
    for (let y = 16; y < size - 16; y += 4) {
      ctx.fillRect(16, y, size - 32, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // PS1 Baseball Bat Texture (Wood Grain & Black Grip Tape)
  public static createBatTexture(): THREE.CanvasTexture {
    const width = 32;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Wood body
    ctx.fillStyle = '#b58348';
    ctx.fillRect(0, 0, width, height);

    // Wood grain strips
    for (let y = 0; y < height; y += 2) {
      const v = Math.sin(y * 0.15) * 15 + (Math.random() - 0.5) * 12;
      ctx.fillStyle = `rgb(${160 + v}, ${115 + v * 0.8}, ${60 + v * 0.5})`;
      ctx.fillRect(0, y, width, 2);
    }

    // Grip Tape (Bottom 35%)
    const tapeHeight = height * 0.38;
    ctx.fillStyle = '#1c1c1f';
    ctx.fillRect(0, height - tapeHeight, width, tapeHeight);

    // Tape wraps
    ctx.strokeStyle = '#2e3036';
    ctx.lineWidth = 3;
    for (let y = height - tapeHeight; y < height; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y + 5);
      ctx.stroke();
    }

    return this.setPixelated(new THREE.CanvasTexture(canvas));
  }

  // PS1 Monster Skin Texture (Ghoulish bruised pale flesh)
  public static createMonsterTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Pale diseased flesh
    ctx.fillStyle = '#585e5e';
    ctx.fillRect(0, 0, size, size);

    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 20;
        const r = 80 + n + (Math.random() > 0.8 ? 20 : 0);
        const g = 85 + n;
        const b = 80 + n + (Math.random() > 0.8 ? 15 : 0);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Veins and Stitches
    ctx.strokeStyle = '#4a2530';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 5);
    ctx.lineTo(25, 30);
    ctx.lineTo(40, 20);
    ctx.lineTo(55, 55);
    ctx.stroke();

    ctx.strokeStyle = '#1e1015';
    for (let i = 8; i < 50; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 20);
      ctx.lineTo(i + 4, 26);
      ctx.stroke();
    }

    return this.setPixelated(new THREE.CanvasTexture(canvas));
  }

  // Exit Door with Glowing Illuminated PS1 Sign
  public static createExitDoorTexture(isLocked: boolean = false): THREE.CanvasTexture {
    const width = 128;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Heavy reinforced steel door
    ctx.fillStyle = '#26292e';
    ctx.fillRect(0, 0, width, height);

    // Steel door frame and inset panels
    ctx.fillStyle = '#1c1e22';
    ctx.fillRect(10, 10, width - 20, height - 20);

    // Upper and lower panels
    ctx.fillStyle = '#30343a';
    ctx.fillRect(18, 50, width - 36, 80);
    ctx.fillRect(18, 145, width - 36, 90);

    // Emergency push bar
    ctx.fillStyle = '#7a2222';
    ctx.fillRect(18, 130, width - 36, 12);
    ctx.fillStyle = '#c73a3a';
    ctx.fillRect(22, 132, width - 44, 4);

    // Hazard stripes at bottom
    ctx.fillStyle = '#e5a522';
    ctx.fillRect(18, height - 30, width - 36, 14);
    ctx.fillStyle = '#1a1c20';
    for (let x = 18; x < width - 36; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, height - 30);
      ctx.lineTo(x + 6, height - 16);
      ctx.lineTo(x + 12, height - 16);
      ctx.lineTo(x + 6, height - 30);
      ctx.fill();
    }

    // EXIT Sign Box
    ctx.fillStyle = isLocked ? '#401212' : '#0e3d1a';
    ctx.fillRect(28, 16, width - 56, 26);
    ctx.strokeStyle = '#121417';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 16, width - 56, 26);

    // EXIT Text
    ctx.fillStyle = isLocked ? '#ff4d4d' : '#45f56c';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', width / 2, 29);

    return this.setPixelated(new THREE.CanvasTexture(canvas));
  }

  // PS1 Forest Ground Texture (Moist dark earth, moss patches, and scattered dry leaves)
  public static createForestGroundTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Dark damp soil base
    ctx.fillStyle = '#181d16';
    ctx.fillRect(0, 0, size, size);

    // Soil grain & noise
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 22;
        const r = Math.max(16, Math.min(45, 26 + n * 0.8));
        const g = Math.max(20, Math.min(52, 32 + n));
        const b = Math.max(14, Math.min(38, 22 + n * 0.6));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Moss patches
    for (let i = 0; i < 7; i++) {
      const mx = Math.random() * size;
      const my = Math.random() * size;
      const rad = 8 + Math.random() * 16;
      const grad = ctx.createRadialGradient(mx, my, 2, mx, my, rad);
      grad.addColorStop(0, 'rgba(46, 68, 30, 0.65)');
      grad.addColorStop(1, 'rgba(24, 29, 22, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mx, my, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scattered dead banana leaves on forest floor
    for (let i = 0; i < 10; i++) {
      const lx = Math.random() * (size - 20) + 10;
      const ly = Math.random() * (size - 20) + 10;
      const angle = Math.random() * Math.PI;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle);
      ctx.fillStyle = Math.random() > 0.4 ? 'rgba(78, 54, 28, 0.75)' : 'rgba(54, 38, 20, 0.8)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7 + Math.random() * 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // PS1 Banana Trunk (Batang / Gedebog Pisang - layered leaf sheaths)
  public static createBananaTrunkTexture(): THREE.CanvasTexture {
    const width = 64;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Base olive-green
    ctx.fillStyle = '#4c5c36';
    ctx.fillRect(0, 0, width, height);

    // Vertical fiber striations
    for (let x = 0; x < width; x += 2) {
      const v = (Math.random() - 0.5) * 24;
      const r = Math.max(50, Math.min(110, 75 + v * 0.9));
      const g = Math.max(65, Math.min(130, 95 + v));
      const b = Math.max(35, Math.min(80, 52 + v * 0.7));
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, 0, 2, height);
    }

    // Horizontal sheath rings (pelepah boundaries)
    ctx.strokeStyle = 'rgba(28, 36, 18, 0.7)';
    ctx.lineWidth = 2;
    for (let y = 14; y < height; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.35, y + 4, width * 0.65, y + 4, width, y);
      ctx.stroke();
    }

    // Dry weathered base fibers (bottom 25%)
    for (let y = height - 32; y < height; y += 3) {
      const shade = 45 + Math.random() * 25;
      ctx.fillStyle = `rgba(${shade + 20}, ${shade * 0.75}, ${shade * 0.5}, 0.7)`;
      ctx.fillRect(0, y, width, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // PS1 Banana Leaf (Daun Pisang Segar - broad paddle with parallel venation)
  public static createBananaLeafTexture(): THREE.CanvasTexture {
    const width = 64;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Lush tropical green base
    ctx.fillStyle = '#3a6624';
    ctx.fillRect(0, 0, width, height);

    // Lateral parallel veins (slanting from center midrib outwards)
    const midX = width / 2;
    ctx.strokeStyle = 'rgba(38, 70, 22, 0.75)';
    ctx.lineWidth = 1.5;

    for (let y = 0; y < height; y += 4) {
      // Left side veins
      ctx.beginPath();
      ctx.moveTo(midX, y);
      ctx.lineTo(0, Math.max(0, y - 8));
      ctx.stroke();

      // Right side veins
      ctx.beginPath();
      ctx.moveTo(midX, y);
      ctx.lineTo(width, Math.max(0, y - 8));
      ctx.stroke();
    }

    // Central prominent light-green midrib (tulang daun)
    ctx.fillStyle = '#78a648';
    ctx.fillRect(midX - 2, 0, 4, height);
    ctx.fillStyle = '#96c858';
    ctx.fillRect(midX - 1, 0, 2, height);

    // Weathered notches / splits along edges
    ctx.fillStyle = '#223c14';
    for (let y = 12; y < height - 10; y += 18) {
      if (Math.random() > 0.3) {
        ctx.fillRect(0, y, 4, 3);
      }
      if (Math.random() > 0.3) {
        ctx.fillRect(width - 4, y + 4, 4, 3);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return this.setPixelated(tex);
  }

  // PS1 Dried Banana Leaf (Klaras / Daun Pisang Kering - golden brown withered)
  public static createDriedLeafTexture(): THREE.CanvasTexture {
    const width = 64;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Golden brown base
    ctx.fillStyle = '#5c4020';
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y += 2) {
      const v = (Math.random() - 0.5) * 20;
      ctx.fillStyle = `rgb(${88 + v}, ${60 + v * 0.7}, ${30 + v * 0.4})`;
      ctx.fillRect(0, y, width, 2);
    }

    // Cracks & dried midrib
    const midX = width / 2;
    ctx.fillStyle = '#7a542b';
    ctx.fillRect(midX - 2, 0, 4, height);

    ctx.strokeStyle = '#281a0b';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const sy = Math.random() * height;
      ctx.beginPath();
      ctx.moveTo(midX, sy);
      ctx.lineTo(Math.random() > 0.5 ? 4 : width - 4, sy + (Math.random() - 0.5) * 14);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return this.setPixelated(tex);
  }

  // PS1 Banana Heart / Blossom (Jantung Pisang)
  public static createBananaBudTexture(): THREE.CanvasTexture {
    const width = 32;
    const height = 64;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Burgundy / deep crimson teardrop
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#58182b');
    grad.addColorStop(0.5, '#7e203c');
    grad.addColorStop(1, '#3c0e1c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Overlapping bract scales
    ctx.strokeStyle = '#2d0a14';
    ctx.lineWidth = 1.5;
    for (let y = 8; y < height; y += 10) {
      ctx.beginPath();
      ctx.arc(width / 2, y, width * 0.45, 0, Math.PI);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return this.setPixelated(tex);
  }

  // PS1 Bamboo Texture (Segmented stalks for torches and village gate)
  public static createBambooTexture(): THREE.CanvasTexture {
    const width = 32;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Yellowish-green bamboo
    ctx.fillStyle = '#7a8e48';
    ctx.fillRect(0, 0, width, height);

    for (let x = 0; x < width; x += 2) {
      const v = (Math.random() - 0.5) * 15;
      ctx.fillStyle = `rgb(${118 + v}, ${140 + v}, ${68 + v * 0.8})`;
      ctx.fillRect(x, 0, 2, height);
    }

    // Segment nodes (buku-buku bambu)
    for (let y = 18; y < height; y += 32) {
      ctx.fillStyle = '#4c5828';
      ctx.fillRect(0, y, width, 4);
      ctx.fillStyle = '#9ab25b';
      ctx.fillRect(0, y + 4, width, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // PS1 Rustic Wood Gate Plank
  public static createGateWoodTexture(): THREE.CanvasTexture {
    const width = 64;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Weathered dark wood
    ctx.fillStyle = '#3a2d20';
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y += 2) {
      const v = Math.sin(y * 0.2) * 14 + (Math.random() - 0.5) * 12;
      ctx.fillStyle = `rgb(${55 + v}, ${42 + v * 0.8}, ${28 + v * 0.5})`;
      ctx.fillRect(0, y, width, 2);
    }

    ctx.strokeStyle = '#18120b';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // =========================================================================
  // ENVIRONMENT THEME TEXTURES (LEVELS 2 - 10)
  // =========================================================================

  // LEVEL 2 — ABANDONED SCHOOL
  public static createSchoolWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Upper pale yellowish plaster (60%)
    ctx.fillStyle = '#b8b29c';
    ctx.fillRect(0, 0, size, size * 0.6);

    // Lower dark green school wainscoting (40%)
    ctx.fillStyle = '#2d4a3e';
    ctx.fillRect(0, size * 0.6, size, size * 0.4);

    // Dividing wood molding trim
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(0, size * 0.6 - 3, size, 5);

    // Dirt noise & peeling paint
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        if (Math.random() > 0.45) {
          const v = (Math.random() - 0.5) * 22;
          ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  public static createSchoolFloorTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base aged institutional concrete/terrazzo linoleum
    ctx.fillStyle = '#3a443e';
    ctx.fillRect(0, 0, size, size);

    // Subtle large tile divisions (64x64px tiles, calm and non-strobe)
    const tileSize = 64;
    for (let ty = 0; ty < size; ty += tileSize) {
      for (let tx = 0; tx < size; tx += tileSize) {
        // Very subtle tonal variance per tile (aged school linoleum)
        const tileAlt = ((tx + ty) / tileSize) % 2 === 0;
        ctx.fillStyle = tileAlt ? '#3e4842' : '#37413b';
        ctx.fillRect(tx + 1, ty + 1, tileSize - 2, tileSize - 2);

        // Thin weathered grout seam
        ctx.strokeStyle = '#252d28';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 0.5, ty + 0.5, tileSize - 1, tileSize - 1);
      }
    }

    // Dirt noise, aged grime, scuffs & foot traffic discoloration
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const rand = Math.random();
        if (rand > 0.65) {
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.12})`;
          ctx.fillRect(x, y, 2, 2);
        } else if (rand < 0.08) {
          // Subtle lighter wear scuffs
          ctx.fillStyle = `rgba(180, 190, 180, ${Math.random() * 0.08})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    // Water stains and weathered patches
    ctx.fillStyle = 'rgba(20, 26, 22, 0.18)';
    ctx.beginPath();
    ctx.ellipse(36, 42, 18, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(98, 88, 22, 14, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Hairline fracture crack
    ctx.strokeStyle = 'rgba(25, 32, 28, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, 80);
    ctx.lineTo(26, 85);
    ctx.lineTo(34, 82);
    ctx.lineTo(44, 90);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  public static createSchoolCeilingSlabTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Weathered concrete slab soffit (underside of upper floor slab)
    ctx.fillStyle = '#2b322d';
    ctx.fillRect(0, 0, size, size);

    // Architectural formwork panel seams (64px wide sections)
    ctx.strokeStyle = '#1d231e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(64, size);
    ctx.moveTo(0, 64);
    ctx.lineTo(size, 64);
    ctx.stroke();

    // Concrete texture mottling & aging
    for (let x = 0; x < size; x += 3) {
      for (let y = 0; y < size; y += 3) {
        if (Math.random() > 0.5) {
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.14})`;
          ctx.fillRect(x, y, 3, 3);
        }
      }
    }

    // Water discoloration seepage marks
    ctx.fillStyle = 'rgba(15, 20, 16, 0.25)';
    ctx.beginPath();
    ctx.arc(52, 60, 24, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  public static createSchoolSlabEdgeTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Poured concrete edge fascia
    ctx.fillStyle = '#303833';
    ctx.fillRect(0, 0, size, size);

    // Horizontal formwork board grooves
    ctx.strokeStyle = '#222824';
    ctx.lineWidth = 1;
    for (let y = 32; y < size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Concrete aggregate speckles
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, y, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // LEVEL 4 — THE HOSPITAL
  public static createHospitalWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Pale sterile mint green plaster
    ctx.fillStyle = '#8fad9e';
    ctx.fillRect(0, 0, size, size);

    // Lower hospital protective bumper guard
    ctx.fillStyle = '#547565';
    ctx.fillRect(0, size - 28, size, 28);
    ctx.fillStyle = '#3a5447';
    ctx.fillRect(0, size - 28, size, 4);

    // Green medical cross icon stencil (random chance)
    ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.fillRect(size / 2 - 4, size / 3 - 14, 8, 28);
    ctx.fillRect(size / 2 - 14, size / 3 - 4, 28, 8);

    // Water stains
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(40, 50, 45, 0.25)';
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 8 + Math.random() * 12, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  public static createHospitalFloorTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Spacious medical-grade linoleum floor (Level 4 — 2x2 large panels, soft seams)
    ctx.fillStyle = '#3f4f48';
    ctx.fillRect(0, 0, size, size);

    const panelSize = size / 2;
    for (let py = 0; py < 2; py++) {
      for (let px = 0; px < 2; px++) {
        const isAlt = (px + py) % 2 === 0;
        ctx.fillStyle = isAlt ? '#465850' : '#41524a';
        ctx.fillRect(px * panelSize + 1, py * panelSize + 1, panelSize - 2, panelSize - 2);

        // Soft sanitary wax sheen
        const sheen = ctx.createLinearGradient(
          px * panelSize,
          py * panelSize,
          px * panelSize,
          (py + 1) * panelSize
        );
        sheen.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
        sheen.addColorStop(1, 'rgba(0, 0, 0, 0.06)');
        ctx.fillStyle = sheen;
        ctx.fillRect(px * panelSize + 1, py * panelSize + 1, panelSize - 2, panelSize - 2);
      }
    }

    // Clean rubberized expansion seam
    ctx.strokeStyle = '#222d28';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panelSize, 0);
    ctx.lineTo(panelSize, size);
    ctx.moveTo(0, panelSize);
    ctx.lineTo(size, panelSize);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // LEVEL 5 — THE SEWER
  public static createSewerWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Damp slimy brown/green brickwork
    ctx.fillStyle = '#302820';
    ctx.fillRect(0, 0, size, size);

    const bh = 16;
    const bw = 32;
    for (let row = 0; row < size / bh; row++) {
      const offset = (row % 2) * (bw / 2);
      for (let col = -1; col < size / bw + 1; col++) {
        const x = col * bw + offset;
        const y = row * bh;
        const moss = Math.random() > 0.4 ? 'rgba(30, 70, 30, 0.4)' : 'rgba(10, 10, 10, 0.3)';
        ctx.fillStyle = moss;
        ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        ctx.strokeStyle = '#181410';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, bw, bh);
      }
    }

    // Slimy drip streaks
    ctx.fillStyle = 'rgba(46, 125, 50, 0.35)';
    ctx.fillRect(20, 0, 8, size);
    ctx.fillRect(75, 10, 12, size - 10);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  public static createSewerWaterTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Deep murky toxic water with broad organic fluid eddies (Level 5 — no 4px scanlines)
    const baseGrad = ctx.createLinearGradient(0, 0, size, size);
    baseGrad.addColorStop(0, '#152514');
    baseGrad.addColorStop(0.5, '#1e331c');
    baseGrad.addColorStop(1, '#182b16');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // Broad organic fluid ripples
    ctx.strokeStyle = 'rgba(75, 125, 60, 0.22)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 25);
    ctx.bezierCurveTo(45, 10, 85, 45, size, 28);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(60, 105, 50, 0.25)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 85);
    ctx.bezierCurveTo(40, 105, 90, 65, size, 90);
    ctx.stroke();

    // Soft floating scum clusters (natural large shapes)
    ctx.fillStyle = 'rgba(95, 145, 65, 0.25)';
    ctx.beginPath();
    ctx.ellipse(36, 48, 22, 14, Math.PI / 6, 0, Math.PI * 2);
    ctx.ellipse(94, 82, 18, 12, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // LEVEL 6 — THE FACTORY
  public static createFactoryWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Weathered industrial red brick with soot
    ctx.fillStyle = '#5c2c20';
    ctx.fillRect(0, 0, size, size);

    const bh = 14;
    const bw = 28;
    for (let r = 0; r < size / bh; r++) {
      const off = (r % 2) * (bw / 2);
      for (let c = -1; c < size / bw + 1; c++) {
        const x = c * bw + off;
        const y = r * bh;
        const tone = (Math.random() - 0.5) * 20;
        ctx.fillStyle = `rgb(${85 + tone}, ${38 + tone * 0.5}, ${26 + tone * 0.5})`;
        ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        ctx.strokeStyle = '#2b140e';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, bw, bh);
      }
    }

    // Black soot overlay
    ctx.fillStyle = 'rgba(15, 15, 15, 0.45)';
    ctx.fillRect(0, 0, size, 24);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  public static createFactoryFloorTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Heavy industrial steel deck plates (Level 6 — 2x2 spacious plates, no vibrating dots)
    ctx.fillStyle = '#30343a';
    ctx.fillRect(0, 0, size, size);

    const half = size / 2;
    for (let py = 0; py < 2; py++) {
      for (let px = 0; px < 2; px++) {
        // Individual steel plate body
        const plateGrad = ctx.createLinearGradient(
          px * half,
          py * half,
          (px + 1) * half,
          (py + 1) * half
        );
        plateGrad.addColorStop(0, '#424953');
        plateGrad.addColorStop(0.5, '#3a414a');
        plateGrad.addColorStop(1, '#2f343b');
        ctx.fillStyle = plateGrad;
        ctx.fillRect(px * half + 2, py * half + 2, half - 4, half - 4);

        // Heavy industrial corner mounting rivets
        ctx.fillStyle = '#647180';
        ctx.beginPath();
        ctx.arc(px * half + 8, py * half + 8, 2.5, 0, Math.PI * 2);
        ctx.arc((px + 1) * half - 8, py * half + 8, 2.5, 0, Math.PI * 2);
        ctx.arc(px * half + 8, (py + 1) * half - 8, 2.5, 0, Math.PI * 2);
        ctx.arc((px + 1) * half - 8, (py + 1) * half - 8, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Subtle diamond grip accent in center (broad, calm)
        ctx.strokeStyle = 'rgba(100, 115, 130, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px * half + 18, py * half + 18, half - 36, half - 36);
      }
    }

    // Heavy welded steel plate border seam
    ctx.strokeStyle = '#181b1f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, size);
    ctx.moveTo(0, half);
    ctx.lineTo(size, half);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // LEVEL 7 — THE HOTEL
  public static createHotelWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Faded vintage floral / damask wallpaper (Gold & Burgundy)
    ctx.fillStyle = '#4a151b';
    ctx.fillRect(0, 0, size, size);

    // Damask diamond pattern
    ctx.strokeStyle = '#b89243';
    ctx.lineWidth = 2;
    const step = 32;
    for (let y = 0; y <= size; y += step) {
      for (let x = 0; x <= size; x += step) {
        ctx.beginPath();
        ctx.moveTo(x + step / 2, y);
        ctx.lineTo(x + step, y + step / 2);
        ctx.lineTo(x + step / 2, y + step);
        ctx.lineTo(x, y + step / 2);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'rgba(184, 146, 67, 0.25)';
        ctx.fill();
      }
    }

    // Wood baseboard
    ctx.fillStyle = '#261208';
    ctx.fillRect(0, size - 22, size, 22);
    ctx.fillStyle = '#452310';
    ctx.fillRect(0, size - 22, size, 4);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  public static createHotelCarpetTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Rich vintage Victorian hotel carpet (Level 7 — continuous plush damask, no jarring chess squares)
    ctx.fillStyle = '#4c0e14';
    ctx.fillRect(0, 0, size, size);

    // Subtle dark wine plush underlay
    ctx.fillStyle = '#380a0f';
    for (let y = 0; y < size; y += 32) {
      for (let x = 0; x < size; x += 32) {
        if ((x + y) % 64 === 0) {
          ctx.fillRect(x, y, 32, 32);
        }
      }
    }

    // Elegant damask diamond woven motif (broad, gentle gold/crimson)
    ctx.strokeStyle = 'rgba(180, 130, 50, 0.35)';
    ctx.lineWidth = 2;
    const step = 64;
    for (let y = 0; y <= size; y += step) {
      for (let x = 0; x <= size; x += step) {
        ctx.beginPath();
        ctx.moveTo(x + step / 2, y);
        ctx.lineTo(x + step, y + step / 2);
        ctx.lineTo(x + step / 2, y + step);
        ctx.lineTo(x, y + step / 2);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'rgba(160, 25, 40, 0.4)';
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // LEVEL 8 — THE SUBWAY
  public static createSubwayWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // White metro subway tile grid
    ctx.fillStyle = '#d6dedc';
    ctx.fillRect(0, 0, size, size);

    const th = 16;
    const tw = 32;
    for (let r = 0; r < size / th; r++) {
      const off = (r % 2) * (tw / 2);
      for (let c = -1; c < size / tw + 1; c++) {
        ctx.strokeStyle = '#54615e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(c * tw + off, r * th, tw, th);
      }
    }

    // Classic blue metro station stripe band
    ctx.fillStyle = '#0f4c81';
    ctx.fillRect(0, 38, size, 16);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(0, 54, size, 4);

    // Grime & brake dust along bottom
    ctx.fillStyle = 'rgba(25, 20, 15, 0.4)';
    ctx.fillRect(0, size - 24, size, 24);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  public static createSubwayPlatformTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Polished subway station granite terrazzo platform (Level 8 — 2x2 large slabs, no repeating yellow lines)
    ctx.fillStyle = '#4c5359';
    ctx.fillRect(0, 0, size, size);

    const half = size / 2;
    for (let py = 0; py < 2; py++) {
      for (let px = 0; px < 2; px++) {
        const isAlt = (px + py) % 2 === 0;
        ctx.fillStyle = isAlt ? '#5c646b' : '#545b62';
        ctx.fillRect(px * half + 2, py * half + 2, half - 4, half - 4);

        // Soft terrazzo mineral speckles (gentle, dispersed)
        ctx.fillStyle = 'rgba(230, 240, 245, 0.12)';
        ctx.fillRect(px * half + 14, py * half + 18, 4, 4);
        ctx.fillRect(px * half + 42, py * half + 38, 4, 4);
        ctx.fillStyle = 'rgba(20, 25, 30, 0.2)';
        ctx.fillRect(px * half + 28, py * half + 44, 4, 4);
      }
    }

    // Clean stone expansion joint lines
    ctx.strokeStyle = '#272c30';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, size);
    ctx.moveTo(0, half);
    ctx.lineTo(size, half);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // LEVEL 9 — RESEARCH FACILITY
  public static createLabWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Futuristic retro metallic composite panels
    ctx.fillStyle = '#8291a1';
    ctx.fillRect(0, 0, size, size);

    // Panel border rivets
    ctx.strokeStyle = '#323c47';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, size - 8, size - 8);

    // Hazard caution diagonal stripes
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(0, size - 20, size, 20);
    ctx.fillStyle = '#1a1f26';
    for (let x = -20; x < size + 20; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, size - 20);
      ctx.lineTo(x + 10, size - 20);
      ctx.lineTo(x + 2, size);
      ctx.lineTo(x - 8, size);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  public static createLabFloorTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Anti-static research facility polymer tiles (Level 9 — 2x2 spacious cleanroom panels)
    ctx.fillStyle = '#b8c6d1';
    ctx.fillRect(0, 0, size, size);

    const half = size / 2;
    for (let py = 0; py < 2; py++) {
      for (let px = 0; px < 2; px++) {
        const isAlt = (px + py) % 2 === 0;
        ctx.fillStyle = isAlt ? '#c8d4de' : '#bfccd6';
        ctx.fillRect(px * half + 2, py * half + 2, half - 4, half - 4);

        // Soft subtle anti-static luster
        const luster = ctx.createLinearGradient(
          px * half,
          py * half,
          (px + 1) * half,
          (py + 1) * half
        );
        luster.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        luster.addColorStop(1, 'rgba(56, 189, 248, 0.05)');
        ctx.fillStyle = luster;
        ctx.fillRect(px * half + 2, py * half + 2, half - 4, half - 4);
      }
    }

    // High-tech polymer joint seam
    ctx.strokeStyle = '#607282';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, size);
    ctx.moveTo(0, half);
    ctx.lineTo(size, half);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // LEVEL 10 — THE NIGHTMARE
  public static createNightmareWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Visible eldritch obsidian stone wall (rich medium-dark slate, not pitch black)
    ctx.fillStyle = '#4e404a';
    ctx.fillRect(0, 0, size, size);

    // Subtle stone texture mottling
    ctx.fillStyle = '#564852';
    for (let i = 0; i < 40; i++) {
      const rx = (i * 37) % size;
      const ry = (i * 29) % size;
      const rw = 12 + (i % 8);
      const rh = 8 + (i % 6);
      ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.fillStyle = '#443740';
    for (let i = 0; i < 30; i++) {
      const rx = (i * 47) % size;
      const ry = (i * 31) % size;
      const rw = 10 + (i % 7);
      const rh = 6 + (i % 5);
      ctx.fillRect(rx, ry, rw, rh);
    }

    // Large stone block courses (two 64px tall block rows)
    // Horizontal mortar groove
    ctx.fillStyle = '#332830';
    ctx.fillRect(0, 62, size, 4);

    // Vertical joints (staggered)
    ctx.fillRect(62, 0, 4, 62);
    ctx.fillRect(0, 64, 4, 64);
    ctx.fillRect(124, 64, 4, 64);

    // Block bevel highlights (top and left edges for crisp 3D stone appearance)
    ctx.strokeStyle = '#685864';
    ctx.lineWidth = 2;
    // Top block 1
    ctx.strokeRect(2, 2, 59, 59);
    // Top block 2
    ctx.strokeRect(66, 2, 59, 59);
    // Bottom block
    ctx.strokeRect(4, 66, 118, 59);

    // Pulsing glowing crimson nightmare veins & fissures
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 8;

    // Primary energy vein
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.bezierCurveTo(40, 52, 75, 18, size, 85);
    ctx.stroke();

    // Hot inner core of primary vein
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.bezierCurveTo(40, 52, 75, 18, size, 85);
    ctx.stroke();

    // Secondary fissure
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size, 40);
    ctx.bezierCurveTo(75, 75, 50, 100, 20, size);
    ctx.stroke();

    ctx.shadowBlur = 0;

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  public static createNightmareFloorTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Visible obsidian stone floor (medium-dark stone slab, bright enough to navigate clearly)
    ctx.fillStyle = '#463a42';
    ctx.fillRect(0, 0, size, size);

    // Subtle stone slab mottling
    ctx.fillStyle = '#4f424b';
    for (let i = 0; i < 35; i++) {
      const rx = (i * 31) % size;
      const ry = (i * 43) % size;
      ctx.fillRect(rx, ry, 14, 10);
    }
    ctx.fillStyle = '#3d3239';
    for (let i = 0; i < 25; i++) {
      const rx = (i * 53) % size;
      const ry = (i * 19) % size;
      ctx.fillRect(rx, ry, 12, 8);
    }

    // 2x2 large stone slabs (64x64 each, calm and spacious without jarring concentric lines)
    ctx.fillStyle = '#2d242b';
    ctx.fillRect(0, 62, size, 4); // horizontal seam
    ctx.fillRect(62, 0, 4, size); // vertical seam

    // Bevel highlights on slab edges
    ctx.strokeStyle = '#5a4c55';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 59, 59);     // Top-left slab
    ctx.strokeRect(66, 2, 59, 59);    // Top-right slab
    ctx.strokeRect(2, 66, 59, 59);    // Bottom-left slab
    ctx.strokeRect(66, 66, 59, 59);   // Bottom-right slab

    // Pulsating occult crimson energy veins across the stone floor
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 6;

    ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 35);
    ctx.bezierCurveTo(42, 65, 80, 25, size, 75);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(248, 113, 113, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 35);
    ctx.bezierCurveTo(42, 65, 80, 25, size, 75);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.bezierCurveTo(55, 45, 50, 85, 75, size);
    ctx.stroke();

    ctx.shadowBlur = 0;

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(tex);
  }

  // =========================================================================
  // LEVEL 5 — MILITARY UNDERGROUND BUNKER TEXTURES (2 FLOORS)
  // =========================================================================

  // PS1 Reinforced Concrete Bunker Wall (Dinding Beton Tebal Bunker Militer — Lantai 1)
  public static createBunkerWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Medium-dark cold concrete base
    ctx.fillStyle = '#4a4d4a';
    ctx.fillRect(0, 0, size, size);

    // Concrete aggregate grain and pores
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 28;
        const r = Math.max(40, Math.min(105, 75 + n));
        const g = Math.max(42, Math.min(108, 78 + n * 0.98));
        const b = Math.max(40, Math.min(105, 74 + n * 0.95));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Heavy horizontal formwork seam lines (garis cetakan beton tebal)
    for (const ySeam of [32, 64, 96]) {
      ctx.fillStyle = 'rgba(25, 26, 25, 0.8)';
      ctx.fillRect(0, ySeam - 1, size, 2);
      ctx.fillStyle = 'rgba(125, 130, 125, 0.4)';
      ctx.fillRect(0, ySeam + 1, size, 1);
    }

    // Vertical panel joints
    for (const xJoint of [42, 84]) {
      ctx.fillStyle = 'rgba(25, 26, 25, 0.7)';
      ctx.fillRect(xJoint, 0, 2, size);
    }

    // Steel anchor bolts (baut baja dinding bunker besar & kokoh)
    const boltPoints = [
      { x: 14, y: 18 }, { x: 64, y: 18 }, { x: 114, y: 18 },
      { x: 14, y: 50 }, { x: 64, y: 50 }, { x: 114, y: 50 },
      { x: 14, y: 82 }, { x: 64, y: 82 }, { x: 114, y: 82 },
    ];
    for (const bp of boltPoints) {
      ctx.fillStyle = '#141714';
      ctx.fillRect(bp.x - 3, bp.y - 3, 7, 7);
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(bp.x - 1, bp.y - 1, 3, 3);
    }

    // Rust drip stains from bolts (lelehan karat besi tebal)
    for (let i = 0; i < 3; i++) {
      const rx = 14 + i * 50;
      const ry = 52;
      ctx.fillStyle = 'rgba(110, 50, 20, 0.6)';
      ctx.fillRect(rx - 1, ry, 3, 26);
      ctx.fillStyle = 'rgba(150, 75, 30, 0.45)';
      ctx.fillRect(rx, ry + 3, 1, 20);
    }

    // Military Hazard Yellow/Black warning stripe at bottom skirt (garis hazard tegas)
    const hY = size - 18;
    for (let x = 0; x < size; x += 16) {
      ctx.fillStyle = '#eab308'; // bright warning yellow
      ctx.fillRect(x, hY, 8, 18);
      ctx.fillStyle = '#18181b'; // hazard black
      ctx.fillRect(x + 8, hY, 8, 18);
    }
    // Hazard top trim line
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, hY - 1, size, 2);

    // Green stencil label "SECTOR-05" (jelas dan terbaca di level mata)
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('SECTOR-05', 10, 28);

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(t);
  }

  // PS1 Reinforced Armored Black Steel Bunker Wall (Dinding Pelat Baja Hitam Lapis Baja — Lantai 2)
  public static createArmoredBunkerWallTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Dark charcoal gunmetal steel base
    ctx.fillStyle = '#1e2225';
    ctx.fillRect(0, 0, size, size);

    // Fine steel brushed texture and metallic grain
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 20;
        const r = Math.max(20, Math.min(65, 34 + n));
        const g = Math.max(22, Math.min(70, 38 + n * 1.05));
        const b = Math.max(24, Math.min(75, 42 + n * 1.1));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Heavy bolted steel armor plate boundary seams (horizontal structural ribs)
    for (const yRib of [30, 68, 102]) {
      ctx.fillStyle = '#0f1113';
      ctx.fillRect(0, yRib - 2, size, 4);
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, yRib - 1, size, 1);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, yRib + 1, size, 1);
    }

    // Vertical armor plate seams
    for (const xSeam of [36, 92]) {
      ctx.fillStyle = '#0f1113';
      ctx.fillRect(xSeam - 2, 0, 4, size);
      ctx.fillStyle = '#475569';
      ctx.fillRect(xSeam - 1, 0, 1, size);
    }

    // Heavy steel industrial rivets / paku keling ganda di sekeliling pelat baja
    const rivetX = [8, 22, 50, 78, 106, 120];
    const rivetY = [12, 48, 84, 116];
    for (const rx of rivetX) {
      for (const ry of rivetY) {
        ctx.fillStyle = '#090a0b';
        ctx.fillRect(rx - 2, ry - 2, 5, 5);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(rx - 1, ry - 1, 3, 3);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(rx, ry, 1, 1);
      }
    }

    // Industrial hydraulic fluid / black grease drips
    for (let i = 0; i < 4; i++) {
      const gx = 24 + i * 28;
      const gy = 32;
      ctx.fillStyle = 'rgba(10, 12, 14, 0.75)';
      ctx.fillRect(gx, gy, 2, 22);
      ctx.fillStyle = 'rgba(25, 30, 36, 0.45)';
      ctx.fillRect(gx - 1, gy + 4, 4, 14);
    }

    // Red & White Hazard Caution diagonal warning stripe along bottom skirt (kontras tegas dari Lantai 1)
    const hY = size - 18;
    for (let x = 0; x < size; x += 16) {
      ctx.fillStyle = '#dc2626'; // bright danger red
      ctx.fillRect(x, hY, 8, 18);
      ctx.fillStyle = '#f8fafc'; // crisp warning white
      ctx.fillRect(x + 8, hY, 8, 18);
    }
    // Top black trim line for hazard stripe
    ctx.fillStyle = '#090a0b';
    ctx.fillRect(0, hY - 1, size, 2);

    // Yellow warning stencil "SUB-02 / RESTRICTED"
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('SUB-02 / RESTRICTED', 8, 22);

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(t);
  }

  // PS1 Industrial Concrete Bunker Floor (Lantai Beton Halus Bunker)
  public static createBunkerFloorTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Dark grey concrete floor slab
    ctx.fillStyle = '#3c403d';
    ctx.fillRect(0, 0, size, size);

    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 20;
        const r = Math.max(30, Math.min(85, 60 + n));
        const g = Math.max(32, Math.min(88, 64 + n * 0.98));
        const b = Math.max(30, Math.min(85, 62 + n * 0.95));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Expansion joint grid lines (garis nat lantai beton)
    ctx.fillStyle = '#1e211e';
    ctx.fillRect(0, 63, size, 2);
    ctx.fillRect(63, 0, 2, size);

    // Scuff marks and oil stains
    for (let i = 0; i < 4; i++) {
      const ox = Math.random() * size;
      const oy = Math.random() * size;
      ctx.fillStyle = 'rgba(18, 18, 18, 0.45)';
      ctx.beginPath();
      ctx.arc(ox, oy, 4 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(t);
  }

  // PS1 Outdoor Bunker Outpost Ground (Tanah Parit Pertahanan Luar Bunker)
  public static createOutdoorBunkerTrenchTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Dark damp gravel & dirt trench base
    ctx.fillStyle = '#323028';
    ctx.fillRect(0, 0, size, size);

    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 24;
        const r = Math.max(30, Math.min(80, 52 + n));
        const g = Math.max(28, Math.min(76, 50 + n * 0.95));
        const b = Math.max(24, Math.min(65, 42 + n * 0.8));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Patches of cracked concrete outpost slabs
    for (let i = 0; i < 6; i++) {
      const cx = Math.random() * (size - 24);
      const cy = Math.random() * (size - 24);
      ctx.fillStyle = '#4c504a';
      ctx.fillRect(cx, cy, 20, 16);
      ctx.fillStyle = '#222421';
      ctx.fillRect(cx + 6, cy + 2, 1, 12); // crack line
    }

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(t);
  }

  // PS1 Cemetery Ground Texture (Tanah Pekuburan Lembap Berlumut & Bertanah Gelap)
  public static createCemeteryGroundTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Damp dark earth base
    ctx.fillStyle = '#23201b';
    ctx.fillRect(0, 0, size, size);

    // Soil & rotting organic noise
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 26;
        const r = Math.max(22, Math.min(65, 38 + n));
        const g = Math.max(20, Math.min(68, 42 + n * 0.95));
        const b = Math.max(16, Math.min(50, 30 + n * 0.7));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Mossy patches (lumut hijau gelap tanah kuburan)
    for (let i = 0; i < 9; i++) {
      const mx = Math.random() * (size - 16);
      const my = Math.random() * (size - 16);
      const mr = 6 + Math.random() * 10;
      ctx.fillStyle = 'rgba(42, 60, 32, 0.5)';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dry fallen leaves & twigs (serasah daun kamboja & beringin gugur)
    for (let i = 0; i < 18; i++) {
      const lx = Math.random() * size;
      const ly = Math.random() * size;
      ctx.fillStyle = i % 2 === 0 ? '#4a3319' : '#5c4826';
      ctx.fillRect(lx, ly, 3, 2);
    }

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(t);
  }

  // PS1 Banyan Tree Bark Texture (Kulit Batang Beringin Tua Berserat Kasar)
  public static createBanyanBarkTexture(): THREE.CanvasTexture {
    const width = 64;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Dark greyish-brown aged banyan bark base
    ctx.fillStyle = '#342f29';
    ctx.fillRect(0, 0, width, height);

    // Deep vertical bark grooves & fibrous ridges
    for (let x = 0; x < width; x += 2) {
      const v = (Math.random() - 0.5) * 28;
      const r = Math.max(35, Math.min(85, 58 + v));
      const g = Math.max(32, Math.min(80, 52 + v * 0.92));
      const b = Math.max(26, Math.min(70, 44 + v * 0.8));
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, 0, 2, height);
    }

    // Wavy aerial root striations
    ctx.strokeStyle = 'rgba(22, 19, 16, 0.75)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const startX = 6 + i * 8;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.bezierCurveTo(startX + 4, height * 0.35, startX - 3, height * 0.65, startX + 2, height);
      ctx.stroke();
    }

    // Moss highlights on trunk crevices
    for (let y = 0; y < height; y += 4) {
      if (Math.random() > 0.6) {
        ctx.fillStyle = 'rgba(52, 72, 38, 0.65)';
        ctx.fillRect(Math.random() * width, y, 4, 3);
      }
    }

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(t);
  }

  // PS1 Banyan Canopy Texture (Kanopi Dedaunan Beringin Rimbun Berakar Gantung)
  public static createBanyanCanopyTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Deep shadow foliage base
    ctx.fillStyle = '#172414';
    ctx.fillRect(0, 0, size, size);

    // Dense leaf clusters noise
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 32;
        const r = Math.max(16, Math.min(60, 28 + n * 0.7));
        const g = Math.max(30, Math.min(95, 52 + n));
        const b = Math.max(14, Math.min(52, 24 + n * 0.6));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Overlapping leaf silhouette flecks
    for (let i = 0; i < 70; i++) {
      const lx = Math.random() * size;
      const ly = Math.random() * size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(58, 92, 42, 0.7)' : 'rgba(18, 32, 14, 0.8)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 3, 5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(t);
  }

  // PS1 Poleng Cloth Texture (Kain Poleng Hitam-Putih Tradisional Pohon Keramat)
  public static createPolengClothTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 8x8 checkerboard pattern (kain sarung kotak catur keramat)
    const tileSize = 8;
    for (let y = 0; y < size; y += tileSize) {
      for (let x = 0; x < size; x += tileSize) {
        const isWhite = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        if (isWhite) {
          ctx.fillStyle = '#e5dec9'; // Off-white aged fabric
        } else {
          ctx.fillStyle = '#171717'; // Charcoal deep black
        }
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // Fabric weave texture noise
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        if (Math.random() > 0.5) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Weathered fringe boundary seam
    ctx.strokeStyle = 'rgba(70, 60, 45, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(t);
  }

  // PS1 Indonesian Tombstone & Kijing Texture (Batu Nisan & Kijing Makam Tua Berlumut)
  public static createTombstoneTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Weathered grey stone base
    ctx.fillStyle = '#4c504d';
    ctx.fillRect(0, 0, size, size);

    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 28;
        const c = Math.max(40, Math.min(115, 78 + n));
        ctx.fillStyle = `rgb(${c}, ${c + 2}, ${c - 2})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Moss stains (bercak lumut hijau pekat di sudut nisan)
    for (let i = 0; i < 7; i++) {
      const mx = Math.random() * size;
      const my = size - 35 + Math.random() * 30;
      ctx.fillStyle = 'rgba(48, 68, 38, 0.65)';
      ctx.beginPath();
      ctx.arc(mx, my, 8 + Math.random() * 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stone cracks (retakan batu nisan kuno)
    ctx.strokeStyle = '#232522';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const sx = 20 + Math.random() * (size - 40);
      const sy = 15 + Math.random() * 40;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 16, sy + 18 + Math.random() * 14);
      ctx.stroke();
    }

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(t);
  }

  // PS1 Cave Stalagmite / Rock Pillar Texture (Batu Karang Stalagmit Purba)
  public static createStalagmiteTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Dark grey limestone rock base
    ctx.fillStyle = '#3e413f';
    ctx.fillRect(0, 0, size, size);

    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 26;
        const c = Math.max(35, Math.min(100, 68 + n));
        ctx.fillStyle = `rgb(${c}, ${c + 1}, ${c + 3})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Vertical mineral drip streaks
    ctx.fillStyle = 'rgba(28, 30, 29, 0.6)';
    for (let i = 0; i < 8; i++) {
      const rx = 10 + i * 14;
      ctx.fillRect(rx, 0, 2 + Math.random() * 2, size);
    }

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return this.setPixelated(t);
  }
}
