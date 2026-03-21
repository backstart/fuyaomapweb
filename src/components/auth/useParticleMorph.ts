import * as THREE from 'three';

interface MorphTarget {
  name: string;
  positions: Float32Array;
  colors: Float32Array;
}

interface ParticleMorphController {
  dispose: () => void;
}

const PARTICLE_COUNT = 7200;
const SWITCH_INTERVAL_MS = 9000;

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGL2RenderingContext
        ? canvas.getContext('webgl2')
        : canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

export function createParticleMorphScene(container: HTMLElement): ParticleMorphController {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 1, 2200);
  camera.position.set(0, 30, 410);

  const group = new THREE.Group();
  group.rotation.x = -0.26;
  scene.add(group);

  const spriteTexture = createPointTexture();
  const geometry = new THREE.BufferGeometry();
  const positionArray = new Float32Array(PARTICLE_COUNT * 3);
  const colorArray = new Float32Array(PARTICLE_COUNT * 3);
  const positionAttribute = new THREE.BufferAttribute(positionArray, 3);
  const colorAttribute = new THREE.BufferAttribute(colorArray, 3);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', colorAttribute);

  const material = new THREE.PointsMaterial({
    size: 2.4,
    map: spriteTexture,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  group.add(points);

  const targets = [
    createCityTarget(PARTICLE_COUNT),
    createMountainTarget(PARTICLE_COUNT),
    createTerrainTarget(PARTICLE_COUNT),
    createSkylineTarget(PARTICLE_COUNT)
  ];

  positionArray.set(targets[0].positions);
  colorArray.set(targets[0].colors);
  positionAttribute.needsUpdate = true;
  colorAttribute.needsUpdate = true;

  let targetIndex = 1;
  let lastSwitchAt = performance.now();
  let animationId = 0;
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let pointerX = 0;
  let pointerY = 0;

  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    pointerTargetX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) - 0.5;
    pointerTargetY = ((event.clientY - rect.top) / Math.max(rect.height, 1)) - 0.5;
  };

  const onPointerLeave = () => {
    pointerTargetX = 0;
    pointerTargetY = 0;
  };

  const animate = (time: number) => {
    if (time - lastSwitchAt >= SWITCH_INTERVAL_MS) {
      targetIndex = (targetIndex + 1) % targets.length;
      lastSwitchAt = time;
    }

    const target = targets[targetIndex];
    pointerX = THREE.MathUtils.lerp(pointerX, pointerTargetX, 0.04);
    pointerY = THREE.MathUtils.lerp(pointerY, pointerTargetY, 0.04);

    for (let index = 0; index < positionArray.length; index += 3) {
      const particleIndex = index / 3;
      const timeOffset = time * 0.00024 + particleIndex * 0.013;
      const hover = Math.sin(timeOffset) * 0.24;
      const depthHover = Math.cos(timeOffset * 0.88) * 0.18;

      positionArray[index] += ((target.positions[index] + hover) - positionArray[index]) * 0.032;
      positionArray[index + 1] += ((target.positions[index + 1] + depthHover) - positionArray[index + 1]) * 0.032;
      positionArray[index + 2] += (target.positions[index + 2] - positionArray[index + 2]) * 0.032;

      colorArray[index] += (target.colors[index] - colorArray[index]) * 0.06;
      colorArray[index + 1] += (target.colors[index + 1] - colorArray[index + 1]) * 0.06;
      colorArray[index + 2] += (target.colors[index + 2] - colorArray[index + 2]) * 0.06;
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;

    group.rotation.y += 0.00135;
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, -0.26 + pointerY * 0.14, 0.035);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, pointerX * 0.09, 0.03);
    group.position.y = Math.sin(time * 0.00028) * 4;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointerX * 34, 0.035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 30 - pointerY * 16, 0.035);
    camera.lookAt(0, 18, 0);

    renderer.render(scene, camera);
    animationId = window.requestAnimationFrame(animate);
  };

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerleave', onPointerLeave);
  animationId = window.requestAnimationFrame(animate);

  return {
    dispose: () => {
      window.cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      geometry.dispose();
      material.dispose();
      spriteTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}

function createPointTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    return new THREE.Texture();
  }

  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.28, 'rgba(225,244,255,0.95)');
  gradient.addColorStop(0.58, 'rgba(168,220,255,0.36)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCityTarget(count: number): MorphTarget {
  const random = createRandom(137);
  const blocks = createCityBlocks(random);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const block = blocks[Math.floor(random() * blocks.length)];
    const face = random();
    const baseX = block.x;
    const baseZ = block.z;
    const width = block.width;
    const depth = block.depth;
    const height = block.height;
    let x = baseX;
    let y = 0;
    let z = baseZ;

    if (face < 0.42) {
      x += (random() - 0.5) * width;
      z += (random() - 0.5) * depth;
      y = height + random() * 8;
    } else if (face < 0.72) {
      x += (random() > 0.5 ? 0.5 : -0.5) * width;
      z += (random() - 0.5) * depth;
      y = random() * height;
    } else {
      x += (random() - 0.5) * width;
      z += (random() > 0.5 ? 0.5 : -0.5) * depth;
      y = random() * height;
    }

    const vertexIndex = index * 3;
    positions[vertexIndex] = x;
    positions[vertexIndex + 1] = y - 90;
    positions[vertexIndex + 2] = z;

    const colorMix = Math.min(1, height / 220);
    setColor(colors, vertexIndex, lerpColor([0.48, 0.78, 1], [0.92, 0.98, 1], colorMix * 0.8 + random() * 0.12));
  }

  return {
    name: 'city',
    positions,
    colors
  };
}

function createMountainTarget(count: number): MorphTarget {
  const random = createRandom(281);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const x = (random() - 0.5) * 520;
    const z = (random() - 0.5) * 280;
    const peakA = 170 * gaussian2(x, z, -120, -10, 70, 48);
    const peakB = 138 * gaussian2(x, z, 34, 30, 82, 56);
    const peakC = 110 * gaussian2(x, z, 150, -30, 64, 52);
    const ridge = 16 * Math.sin(x * 0.018) + 8 * Math.cos(z * 0.026);
    const y = peakA + peakB + peakC + ridge + random() * 8;

    const vertexIndex = index * 3;
    positions[vertexIndex] = x;
    positions[vertexIndex + 1] = y - 100;
    positions[vertexIndex + 2] = z;

    const elevationMix = THREE.MathUtils.clamp((y + 20) / 220, 0, 1);
    setColor(colors, vertexIndex, lerpColor([0.38, 0.64, 0.88], [0.92, 0.98, 1], elevationMix));
  }

  return {
    name: 'mountain',
    positions,
    colors
  };
}

function createTerrainTarget(count: number): MorphTarget {
  const random = createRandom(419);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const x = (random() - 0.5) * 560;
    const z = (random() - 0.5) * 320;
    const y =
      Math.sin(x * 0.022) * 22 +
      Math.cos(z * 0.028) * 18 +
      Math.sin((x + z) * 0.016) * 12 +
      random() * 8;

    const vertexIndex = index * 3;
    positions[vertexIndex] = x;
    positions[vertexIndex + 1] = y - 44;
    positions[vertexIndex + 2] = z;

    const terrainMix = THREE.MathUtils.clamp((y + 50) / 110, 0, 1);
    setColor(colors, vertexIndex, lerpColor([0.3, 0.58, 0.84], [0.82, 0.95, 1], terrainMix));
  }

  return {
    name: 'terrain',
    positions,
    colors
  };
}

function createSkylineTarget(count: number): MorphTarget {
  const random = createRandom(563);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const bars = createSkylineBars(random);

  for (let index = 0; index < count; index += 1) {
    const bar = bars[Math.floor(random() * bars.length)];
    const x = bar.x + (random() - 0.5) * bar.width;
    const y = random() < 0.62 ? random() * bar.height : bar.height + random() * 6;
    const z = (random() - 0.5) * bar.depth;
    const arcLift = 18 * Math.exp(-Math.pow(x / 240, 2));
    const vertexIndex = index * 3;
    positions[vertexIndex] = x;
    positions[vertexIndex + 1] = y + arcLift - 86;
    positions[vertexIndex + 2] = z;

    const skylineMix = THREE.MathUtils.clamp((y + arcLift) / 190, 0, 1);
    setColor(colors, vertexIndex, lerpColor([0.44, 0.72, 0.98], [1, 0.92, 0.72], skylineMix * 0.2 + 0.15));
  }

  return {
    name: 'skyline',
    positions,
    colors
  };
}

function createCityBlocks(random: () => number) {
  const blocks: Array<{ x: number; z: number; width: number; depth: number; height: number }> = [];
  for (let gx = -4; gx <= 4; gx += 1) {
    for (let gz = -2; gz <= 2; gz += 1) {
      if (random() < 0.16) {
        continue;
      }

      blocks.push({
        x: gx * 54 + (random() - 0.5) * 16,
        z: gz * 44 + (random() - 0.5) * 14,
        width: 20 + random() * 26,
        depth: 18 + random() * 24,
        height: 36 + Math.pow(random(), 0.62) * 210
      });
    }
  }

  return blocks;
}

function createSkylineBars(random: () => number) {
  const bars: Array<{ x: number; width: number; height: number; depth: number }> = [];
  for (let index = 0; index < 18; index += 1) {
    const t = index / 17;
    const x = -250 + t * 500;
    const height =
      40 +
      150 * Math.exp(-Math.pow((t - 0.52) / 0.23, 2)) +
      28 * Math.sin(t * Math.PI * 4) +
      random() * 20;

    bars.push({
      x,
      width: 18 + random() * 18,
      height: Math.max(26, height),
      depth: 16 + random() * 10
    });
  }

  return bars;
}

function gaussian2(x: number, z: number, centerX: number, centerZ: number, sigmaX: number, sigmaZ: number): number {
  const dx = x - centerX;
  const dz = z - centerZ;
  return Math.exp(-((dx * dx) / (2 * sigmaX * sigmaX) + (dz * dz) / (2 * sigmaZ * sigmaZ)));
}

function setColor(target: Float32Array, offset: number, color: [number, number, number]): void {
  target[offset] = color[0];
  target[offset + 1] = color[1];
  target[offset + 2] = color[2];
}

function lerpColor(from: [number, number, number], to: [number, number, number], alpha: number): [number, number, number] {
  return [
    THREE.MathUtils.lerp(from[0], to[0], alpha),
    THREE.MathUtils.lerp(from[1], to[1], alpha),
    THREE.MathUtils.lerp(from[2], to[2], alpha)
  ];
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
