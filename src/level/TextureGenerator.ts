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
    ctx.fillStyle = '#3c4046';
    ctx.fillRect(0, 0, size, size);

    // Concrete noise
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const n = (Math.random() - 0.5) * 35;
        const c = Math.max(30, Math.min(85, 60 + n));
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

  // PS1 Tiled Industrial Floor
  public static createFloorTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 4x4 Tiles
    const tileSize = size / 4;
    for (let ty = 0; ty < 4; ty++) {
      for (let tx = 0; tx < 4; tx++) {
        const isDark = (tx + ty) % 2 === 0;
        const base = isDark ? 42 : 55;
        ctx.fillStyle = `rgb(${base}, ${base - 2}, ${base - 4})`;
        ctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);

        // Tile inner noise
        for (let ix = 0; ix < tileSize; ix += 4) {
          for (let iy = 0; iy < tileSize; iy += 4) {
            const noise = (Math.random() - 0.5) * 18;
            const col = Math.max(20, Math.min(80, base + noise));
            ctx.fillStyle = `rgb(${col}, ${col - 2}, ${col - 4})`;
            ctx.fillRect(tx * tileSize + ix, ty * tileSize + iy, 4, 4);
          }
        }
      }
    }

    // Tile Grout
    ctx.strokeStyle = '#15171a';
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i += tileSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

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

    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, size, size);

    // Grid panels
    ctx.strokeStyle = '#121417';
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
}
