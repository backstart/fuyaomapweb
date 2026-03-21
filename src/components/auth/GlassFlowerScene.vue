<template>
  <section
    class="glass-flower-scene"
    @pointermove="handlePointerMove"
    @pointerleave="resetPointer"
  >
    <div class="scene-backdrop"></div>
    <div class="scene-mist mist-left" :style="mistLeftStyle"></div>
    <div class="scene-mist mist-right" :style="mistRightStyle"></div>
    <StarParticleLayer />

    <div class="scene-stage" :style="stageStyle">
      <svg
        class="scene-svg"
        viewBox="0 0 960 760"
        role="presentation"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="glassPetalWarm" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
            <stop offset="32%" stop-color="#fff5df" stop-opacity="0.78" />
            <stop offset="70%" stop-color="#d7efff" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.04" />
          </linearGradient>
          <linearGradient id="glassPetalCool" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f5fcff" stop-opacity="0.92" />
            <stop offset="42%" stop-color="#d0eeff" stop-opacity="0.54" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.06" />
          </linearGradient>
          <linearGradient id="glassPetalPearl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fff9f1" stop-opacity="0.9" />
            <stop offset="40%" stop-color="#f2fbff" stop-opacity="0.52" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.08" />
          </linearGradient>
          <radialGradient id="petalSheenWarm" cx="50%" cy="18%" r="74%">
            <stop offset="0%" stop-color="#fffef9" stop-opacity="0.78" />
            <stop offset="48%" stop-color="#fff8ec" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="petalSheenCool" cx="46%" cy="20%" r="76%">
            <stop offset="0%" stop-color="#eff9ff" stop-opacity="0.68" />
            <stop offset="50%" stop-color="#e4f5ff" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fff7de" stop-opacity="1" />
            <stop offset="34%" stop-color="#ffeab4" stop-opacity="0.9" />
            <stop offset="72%" stop-color="#eaf8ff" stop-opacity="0.24" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="baseGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#d5f4ff" stop-opacity="0.82" />
            <stop offset="58%" stop-color="#98ddff" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
          <filter id="coreSoftGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="reflectionBlur" x="-40%" y="-40%" width="180%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <linearGradient id="reflectionMaskGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
            <stop offset="22%" stop-color="#ffffff" stop-opacity="0.34" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.94" />
          </linearGradient>
          <mask id="reflectionMask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            <rect x="0" y="0" width="960" height="760" fill="#000000" />
            <rect x="0" y="470" width="960" height="250" fill="url(#reflectionMaskGradient)" />
          </mask>
        </defs>

        <g id="glass-flower-art">
          <g class="flower-root">
            <path
              v-for="filament in rootFilaments"
              :key="filament.key"
              class="root-filament"
              :d="filament.d"
              :style="filament.style"
            />
            <circle
              v-for="spark in baseSparks"
              :key="spark.key"
              class="base-spark"
              :cx="spark.cx"
              :cy="spark.cy"
              :r="spark.r"
              :style="spark.style"
            />
          </g>

          <ellipse cx="446" cy="560" rx="128" ry="34" class="base-light" />

          <g class="flower-body">
            <g
              v-for="petal in supportPetals"
              :key="petal.key"
              :transform="petal.transform"
            >
              <g class="petal-motion support-motion" :style="petal.motionStyle">
                <path class="petal-fill support-fill" :d="petal.path" :fill="petal.fill" :opacity="petal.opacity" />
                <path class="petal-outline" :d="petal.path" :opacity="petal.strokeOpacity" />
                <path class="petal-sheen" :d="petal.sheenPath" :fill="petal.sheenFill" :opacity="petal.sheenOpacity" />
                <path class="petal-vein" :d="petal.veinPath" :opacity="petal.veinOpacity" />
              </g>
            </g>

            <g
              v-for="petal in backPetals"
              :key="petal.key"
              :transform="petal.transform"
            >
              <g class="petal-motion back-motion" :style="petal.motionStyle">
                <path class="petal-fill" :d="petal.path" :fill="petal.fill" :opacity="petal.opacity" />
                <path class="petal-outline" :d="petal.path" :opacity="petal.strokeOpacity" />
                <path class="petal-sheen" :d="petal.sheenPath" :fill="petal.sheenFill" :opacity="petal.sheenOpacity" />
                <path class="petal-vein" :d="petal.veinPath" :opacity="petal.veinOpacity" />
              </g>
            </g>

            <g
              v-for="petal in middlePetals"
              :key="petal.key"
              :transform="petal.transform"
            >
              <g class="petal-motion middle-motion" :style="petal.motionStyle">
                <path class="petal-fill middle-fill" :d="petal.path" :fill="petal.fill" :opacity="petal.opacity" />
                <path class="petal-outline" :d="petal.path" :opacity="petal.strokeOpacity" />
                <path class="petal-sheen" :d="petal.sheenPath" :fill="petal.sheenFill" :opacity="petal.sheenOpacity" />
                <path class="petal-vein" :d="petal.veinPath" :opacity="petal.veinOpacity" />
              </g>
            </g>

            <g
              v-for="petal in corePetals"
              :key="petal.key"
              :transform="petal.transform"
            >
              <g class="petal-motion core-motion" :style="petal.motionStyle">
                <path class="petal-fill core-fill" :d="petal.path" :fill="petal.fill" :opacity="petal.opacity" />
                <path class="petal-outline core-outline" :d="petal.path" :opacity="petal.strokeOpacity" />
                <path class="petal-sheen" :d="petal.sheenPath" :fill="petal.sheenFill" :opacity="petal.sheenOpacity" />
                <path class="petal-vein" :d="petal.veinPath" :opacity="petal.veinOpacity" />
              </g>
            </g>
          </g>

          <g class="flower-core">
            <circle cx="446" cy="306" r="90" class="core-glow-halo" />
            <circle cx="446" cy="306" r="66" class="core-center" />
            <circle cx="446" cy="306" r="30" class="core-hotspot" />

            <g
              v-for="filament in centerFilaments"
              :key="filament.key"
              :transform="filament.transform"
            >
              <path class="center-filament" :d="filament.d" :style="filament.style" />
              <circle class="center-anther" :cx="filament.tipX" :cy="filament.tipY" :r="filament.tipR" />
            </g>

            <circle
              v-for="spark in coreSparks"
              :key="spark.key"
              class="core-spark"
              :cx="spark.cx"
              :cy="spark.cy"
              :r="spark.r"
              :style="spark.style"
            />
          </g>
        </g>

        <use href="#glass-flower-art"></use>

        <g class="flower-reflection" mask="url(#reflectionMask)">
          <g transform="translate(0 736) scale(1 -0.58)">
            <use href="#glass-flower-art"></use>
          </g>
        </g>
      </svg>

      <div class="stage-light"></div>
      <WaterReflectionLayer />
    </div>

    <div class="scene-copy" :style="copyStyle">
      <p class="scene-kicker">空间入口</p>
      <h2>星光、水影与琉璃花瓣交织的地图服务入口。</h2>
      <p class="scene-description">店铺、区域、导入与管理一体化平台。</p>
    </div>

    <div class="scene-vignette"></div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StarParticleLayer from '@/components/auth/StarParticleLayer.vue';
import WaterReflectionLayer from '@/components/auth/WaterReflectionLayer.vue';

interface PetalSpec {
  key: string;
  transform: string;
  path: string;
  sheenPath: string;
  veinPath: string;
  fill: string;
  sheenFill: string;
  opacity: number;
  sheenOpacity: number;
  strokeOpacity: number;
  veinOpacity: number;
  motionStyle: Record<string, string>;
}

interface RootFilamentSpec {
  key: string;
  d: string;
  style: Record<string, string>;
}

interface CenterFilamentSpec {
  key: string;
  transform: string;
  d: string;
  tipX: number;
  tipY: number;
  tipR: number;
  style: Record<string, string>;
}

interface SparkSpec {
  key: string;
  cx: number;
  cy: number;
  r: number;
  style: Record<string, string>;
}

type PetalShape = 'wide' | 'guard' | 'inner' | 'core';

const pointerX = ref(0);
const pointerY = ref(0);
const reducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const petalShapes: Record<PetalShape, { path: string; sheenPath: string; veinPath: string }> = {
  wide: {
    path: 'M0 0 C -58 -20 -132 -62 -150 -144 C -164 -214 -118 -298 0 -346 C 118 -298 164 -214 150 -144 C 132 -62 58 -20 0 0 Z',
    sheenPath: 'M0 -6 C -22 -36 -56 -88 -58 -170 C -58 -236 -24 -292 0 -324 C 24 -292 58 -236 58 -170 C 56 -88 22 -36 0 -6 Z',
    veinPath: 'M0 -8 C -14 -74 -14 -168 0 -318 C 14 -168 14 -74 0 -8'
  },
  guard: {
    path: 'M0 0 C -76 -10 -150 -46 -188 -114 C -212 -156 -206 -216 -150 -258 C -104 -292 -40 -312 0 -320 C 40 -312 104 -292 150 -258 C 206 -216 212 -156 188 -114 C 150 -46 76 -10 0 0 Z',
    sheenPath: 'M0 -2 C -54 -30 -98 -90 -98 -154 C -98 -214 -46 -268 0 -300 C 46 -268 98 -214 98 -154 C 98 -90 54 -30 0 -2 Z',
    veinPath: 'M0 -4 C -24 -52 -26 -136 0 -286 C 26 -136 24 -52 0 -4'
  },
  inner: {
    path: 'M0 0 C -28 -14 -64 -48 -80 -94 C -92 -132 -72 -182 0 -234 C 72 -182 92 -132 80 -94 C 64 -48 28 -14 0 0 Z',
    sheenPath: 'M0 -6 C -14 -22 -26 -66 -20 -124 C -14 -176 -4 -206 0 -220 C 4 -206 14 -176 20 -124 C 26 -66 14 -22 0 -6 Z',
    veinPath: 'M0 -4 C -10 -42 -12 -104 0 -214 C 12 -104 10 -42 0 -4'
  },
  core: {
    path: 'M0 0 C -18 -8 -42 -28 -54 -58 C -62 -88 -50 -124 0 -164 C 50 -124 62 -88 54 -58 C 42 -28 18 -8 0 0 Z',
    sheenPath: 'M0 -4 C -10 -18 -16 -44 -12 -82 C -8 -114 -2 -140 0 -152 C 2 -140 8 -114 12 -82 C 16 -44 10 -18 0 -4 Z',
    veinPath: 'M0 -4 C -6 -28 -6 -74 0 -148 C 6 -74 6 -28 0 -4'
  }
};

const supportPetals = buildPetals('support', [
  { angle: -126, distance: 132, scale: 0.84, shape: 'guard', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.5 },
  { angle: -96, distance: 158, scale: 0.9, shape: 'guard', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.52 },
  { angle: -66, distance: 176, scale: 0.92, shape: 'guard', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.54 },
  { angle: 66, distance: 176, scale: 0.92, shape: 'guard', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.54 },
  { angle: 96, distance: 158, scale: 0.9, shape: 'guard', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.52 },
  { angle: 126, distance: 132, scale: 0.84, shape: 'guard', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.5 }
], 446, 402);

const backPetals = buildPetals('back', [
  { angle: -82, distance: 190, scale: 1.02, shape: 'wide', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.58 },
  { angle: -58, distance: 176, scale: 1.06, shape: 'wide', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.62 },
  { angle: -34, distance: 164, scale: 1.02, shape: 'wide', fill: 'url(#glassPetalWarm)', sheen: 'url(#petalSheenWarm)', opacity: 0.68 },
  { angle: -10, distance: 154, scale: 0.96, shape: 'wide', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.72 },
  { angle: 10, distance: 154, scale: 0.96, shape: 'wide', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.72 },
  { angle: 34, distance: 164, scale: 1.02, shape: 'wide', fill: 'url(#glassPetalWarm)', sheen: 'url(#petalSheenWarm)', opacity: 0.68 },
  { angle: 58, distance: 176, scale: 1.06, shape: 'wide', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.62 },
  { angle: 82, distance: 190, scale: 1.02, shape: 'wide', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.58 }
], 446, 360);

const middlePetals = buildPetals('middle', [
  { angle: -78, distance: 128, scale: 0.76, shape: 'inner', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.74 },
  { angle: -60, distance: 120, scale: 0.8, shape: 'inner', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.74 },
  { angle: -42, distance: 114, scale: 0.82, shape: 'inner', fill: 'url(#glassPetalWarm)', sheen: 'url(#petalSheenWarm)', opacity: 0.78 },
  { angle: -24, distance: 106, scale: 0.84, shape: 'inner', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.82 },
  { angle: -8, distance: 98, scale: 0.82, shape: 'inner', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.82 },
  { angle: 8, distance: 98, scale: 0.82, shape: 'inner', fill: 'url(#glassPetalWarm)', sheen: 'url(#petalSheenWarm)', opacity: 0.82 },
  { angle: 24, distance: 106, scale: 0.84, shape: 'inner', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.82 },
  { angle: 42, distance: 114, scale: 0.82, shape: 'inner', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.78 },
  { angle: 60, distance: 120, scale: 0.8, shape: 'inner', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.74 },
  { angle: 78, distance: 128, scale: 0.76, shape: 'inner', fill: 'url(#glassPetalWarm)', sheen: 'url(#petalSheenWarm)', opacity: 0.74 }
], 446, 354);

const corePetals = buildPetals('core', [
  { angle: -82, distance: 76, scale: 0.52, shape: 'core', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.82 },
  { angle: -64, distance: 68, scale: 0.56, shape: 'core', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.84 },
  { angle: -48, distance: 62, scale: 0.58, shape: 'core', fill: 'url(#glassPetalWarm)', sheen: 'url(#petalSheenWarm)', opacity: 0.86 },
  { angle: -32, distance: 58, scale: 0.6, shape: 'core', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.88 },
  { angle: -16, distance: 54, scale: 0.62, shape: 'core', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.9 },
  { angle: 0, distance: 50, scale: 0.64, shape: 'core', fill: 'url(#glassPetalWarm)', sheen: 'url(#petalSheenWarm)', opacity: 0.92 },
  { angle: 16, distance: 54, scale: 0.62, shape: 'core', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.9 },
  { angle: 32, distance: 58, scale: 0.6, shape: 'core', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.88 },
  { angle: 48, distance: 62, scale: 0.58, shape: 'core', fill: 'url(#glassPetalWarm)', sheen: 'url(#petalSheenWarm)', opacity: 0.86 },
  { angle: 64, distance: 68, scale: 0.56, shape: 'core', fill: 'url(#glassPetalPearl)', sheen: 'url(#petalSheenWarm)', opacity: 0.84 },
  { angle: 82, distance: 76, scale: 0.52, shape: 'core', fill: 'url(#glassPetalCool)', sheen: 'url(#petalSheenCool)', opacity: 0.82 }
], 446, 338);

const rootFilaments: RootFilamentSpec[] = Array.from({ length: 20 }, (_, index) => {
  const ratio = index / 19;
  const startX = 378 + ratio * 136;
  const startY = 546 + Math.sin(ratio * Math.PI) * 12;
  const controlX1 = startX - 54 + ratio * 22;
  const controlY1 = 512 - ratio * 14;
  const controlX2 = 388 + ratio * 118;
  const controlY2 = 452 - Math.sin(ratio * Math.PI) * 26;
  const endX = 420 + ratio * 56;
  const endY = 366 - Math.cos(ratio * Math.PI) * 20;

  return {
    key: `root-${index}`,
    d: `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`,
    style: {
      '--delay': `${(index % 7) * 0.5}s`,
      '--sway': `${4 + (index % 4) * 1.5}px`,
      opacity: `${0.24 + ratio * 0.34}`
    }
  };
});

const centerFilaments: CenterFilamentSpec[] = Array.from({ length: 22 }, (_, index) => {
  const ratio = index / 21;
  const angle = -108 + ratio * 216;
  const length = 58 + Math.sin(ratio * Math.PI) * 18;
  const tipY = -length;

  return {
    key: `center-${index}`,
    transform: `translate(446 306) rotate(${angle})`,
    d: `M 0 0 C -8 -10 -10 -26 0 ${tipY}`,
    tipX: 0,
    tipY,
    tipR: 1.5 + (index % 3) * 0.55,
    style: {
      '--delay': `${index * 0.18}s`,
      opacity: `${0.34 + Math.sin(ratio * Math.PI) * 0.42}`
    }
  };
});

const baseSparks: SparkSpec[] = Array.from({ length: 8 }, (_, index) => ({
  key: `base-spark-${index}`,
  cx: 382 + index * 18,
  cy: 554 - ((index % 3) * 6),
  r: 1.6 + (index % 2) * 0.8,
  style: {
    '--delay': `${index * 0.32}s`
  }
}));

const coreSparks: SparkSpec[] = Array.from({ length: 18 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 18;
  const distance = 16 + (index % 4) * 10;

  return {
    key: `core-spark-${index}`,
    cx: 446 + Math.cos(angle) * distance,
    cy: 306 + Math.sin(angle) * distance * 0.65,
    r: 1.2 + (index % 3) * 0.7,
    style: {
      '--delay': `${index * 0.24}s`
    }
  };
});

const stageStyle = computed<Record<string, string>>(() => ({
  transform: reducedMotion
    ? 'translate3d(0, 0, 0)'
    : `translate3d(${pointerX.value * 10}px, ${pointerY.value * 8}px, 0)`
}));

const mistLeftStyle = computed<Record<string, string>>(() => ({
  transform: reducedMotion
    ? 'translate3d(0, 0, 0)'
    : `translate3d(${pointerX.value * -18}px, ${pointerY.value * -12}px, 0)`
}));

const mistRightStyle = computed<Record<string, string>>(() => ({
  transform: reducedMotion
    ? 'translate3d(0, 0, 0)'
    : `translate3d(${pointerX.value * 16}px, ${pointerY.value * 10}px, 0)`
}));

const copyStyle = computed<Record<string, string>>(() => ({
  transform: reducedMotion
    ? 'translate3d(0, 0, 0)'
    : `translate3d(${pointerX.value * 8}px, ${pointerY.value * 6}px, 0)`
}));

function buildPetals(
  prefix: string,
  configs: Array<{
    angle: number;
    distance: number;
    scale: number;
    shape: PetalShape;
    fill: string;
    sheen: string;
    opacity: number;
  }>,
  anchorX: number,
  anchorY: number
): PetalSpec[] {
  return configs.map((config, index) => {
    const shape = petalShapes[config.shape];
    return {
      key: `${prefix}-${index}`,
      transform: `translate(${anchorX} ${anchorY}) rotate(${config.angle}) translate(0 ${-config.distance}) scale(${config.scale})`,
      path: shape.path,
      sheenPath: shape.sheenPath,
      veinPath: shape.veinPath,
      fill: config.fill,
      sheenFill: config.sheen,
      opacity: config.opacity,
      sheenOpacity: 0.2 + index * 0.02,
      strokeOpacity: 0.2 + index * 0.015,
      veinOpacity: 0.12 + index * 0.012,
      motionStyle: {
        '--delay': `${index * 0.42}s`,
        '--lift': `${5 + (index % 4) * 1.8}px`,
        '--sway': `${((index % 2 === 0 ? -1 : 1) * (4 + (index % 3) * 1.2))}px`
      }
    };
  });
}

function handlePointerMove(event: PointerEvent): void {
  if (reducedMotion) {
    return;
  }

  const target = event.currentTarget as HTMLElement | null;
  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  pointerX.value = ((event.clientX - rect.left) / Math.max(rect.width, 1)) - 0.5;
  pointerY.value = ((event.clientY - rect.top) / Math.max(rect.height, 1)) - 0.5;
}

function resetPointer(): void {
  pointerX.value = 0;
  pointerY.value = 0;
}
</script>

<style scoped>
.glass-flower-scene {
  position: relative;
  min-height: min(80vh, 880px);
  border-radius: 36px;
  overflow: hidden;
  background:
    radial-gradient(circle at 46% 30%, rgba(255, 238, 205, 0.04), transparent 18%),
    linear-gradient(180deg, #010202 0%, #03060b 46%, #040a13 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 36px 120px rgba(0, 0, 0, 0.42);
}

.scene-backdrop,
.scene-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-backdrop {
  background:
    radial-gradient(circle at 46% 34%, rgba(255, 231, 178, 0.08), transparent 22%),
    radial-gradient(circle at 42% 46%, rgba(162, 215, 255, 0.08), transparent 28%),
    linear-gradient(160deg, rgba(2, 4, 6, 0.98) 0%, rgba(2, 4, 8, 0.94) 44%, rgba(3, 7, 14, 0.98) 100%);
}

.scene-vignette {
  background:
    radial-gradient(circle at 48% 42%, rgba(255, 255, 255, 0), rgba(0, 0, 0, 0.08) 48%, rgba(0, 0, 0, 0.7) 100%);
}

.scene-mist {
  position: absolute;
  border-radius: 50%;
  filter: blur(50px);
  opacity: 0.55;
  transition: transform 420ms ease-out;
  pointer-events: none;
}

.mist-left {
  left: 20%;
  top: 20%;
  width: 200px;
  height: 180px;
  background: radial-gradient(circle, rgba(255, 231, 181, 0.14), rgba(255, 231, 181, 0.02) 70%, transparent);
}

.mist-right {
  left: 54%;
  top: 36%;
  width: 260px;
  height: 220px;
  background: radial-gradient(circle, rgba(161, 220, 255, 0.14), rgba(161, 220, 255, 0.02) 74%, transparent);
}

.scene-stage {
  position: absolute;
  inset: 2% 3.5% 8% 3.5%;
  transition: transform 460ms ease-out;
}

.scene-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.petal-motion,
.root-filament,
.center-filament {
  transform-box: fill-box;
  transform-origin: center bottom;
}

.petal-motion {
  animation: petalFloat 12s ease-in-out infinite var(--delay);
}

.support-motion {
  animation-duration: 14s;
}

.middle-motion {
  animation-duration: 9s;
}

.core-motion {
  animation-duration: 7.5s;
}

.petal-fill {
  filter: drop-shadow(0 0 7px rgba(255, 238, 199, 0.08));
}

.petal-outline {
  fill: none;
  stroke: rgba(246, 248, 255, 0.34);
  stroke-width: 1.25;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.core-outline {
  stroke-width: 1.1;
}

.petal-sheen {
  mix-blend-mode: screen;
}

.petal-vein {
  fill: none;
  stroke: rgba(252, 252, 255, 0.32);
  stroke-width: 0.85;
  stroke-linecap: round;
}

.support-fill {
  opacity: 0.5;
}

.middle-fill {
  opacity: 0.8;
}

.core-fill {
  opacity: 0.92;
}

.root-filament {
  fill: none;
  stroke: rgba(159, 220, 255, 0.5);
  stroke-width: 2;
  stroke-linecap: round;
  animation: filamentSway 14s ease-in-out infinite var(--delay);
}

.base-light {
  fill: url(#baseGlow);
}

.base-spark,
.core-spark,
.center-anther {
  fill: rgba(255, 245, 214, 0.94);
}

.base-spark {
  animation: twinkle 4.6s ease-in-out infinite var(--delay);
}

.flower-core {
  filter: url(#coreSoftGlow);
}

.core-glow-halo {
  fill: url(#coreGlow);
  opacity: 0.76;
}

.core-center {
  fill: url(#coreGlow);
  animation: corePulse 7.6s ease-in-out infinite;
}

.core-hotspot {
  fill: rgba(255, 247, 225, 0.92);
  animation: corePulse 5.8s ease-in-out infinite;
}

.center-filament {
  fill: none;
  stroke: rgba(255, 244, 214, 0.66);
  stroke-width: 1.05;
  stroke-linecap: round;
  animation: filamentSway 10s ease-in-out infinite var(--delay);
}

.center-anther {
  filter: drop-shadow(0 0 8px rgba(255, 229, 168, 0.38));
}

.core-spark {
  filter: drop-shadow(0 0 8px rgba(255, 230, 168, 0.34));
  animation: twinkle 4.2s ease-in-out infinite var(--delay);
}

.flower-reflection {
  opacity: 0.34;
  filter: url(#reflectionBlur);
}

.stage-light {
  position: absolute;
  left: 28%;
  right: 24%;
  bottom: 16%;
  height: 18%;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(255, 237, 194, 0.14), rgba(155, 224, 255, 0.06) 44%, rgba(255, 255, 255, 0) 74%);
  filter: blur(18px);
  pointer-events: none;
}

.scene-copy {
  position: absolute;
  left: 8%;
  right: 36%;
  bottom: 6%;
  z-index: 2;
  color: rgba(240, 245, 252, 0.92);
  transition: transform 460ms ease-out;
}

.scene-kicker {
  margin: 0 0 10px;
  color: rgba(146, 206, 255, 0.72);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.scene-copy h2 {
  max-width: 540px;
  margin: 0;
  font-size: clamp(1.55rem, 1.9vw, 2.3rem);
  line-height: 1.28;
  font-weight: 500;
}

.scene-description {
  margin: 12px 0 0;
  color: rgba(211, 224, 239, 0.62);
  font-size: 14px;
}

@keyframes petalFloat {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }

  50% {
    transform: translate3d(var(--sway), calc(-1 * var(--lift)), 0) rotate(0.6deg);
  }
}

@keyframes filamentSway {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(var(--sway), -2px, 0);
  }
}

@keyframes corePulse {
  0%,
  100% {
    opacity: 0.84;
    transform: scale(0.98);
  }

  50% {
    opacity: 1;
    transform: scale(1.03);
  }
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.42;
  }

  50% {
    opacity: 1;
  }
}

@media (max-width: 1080px) {
  .glass-flower-scene {
    min-height: min(56vh, 600px);
    border-radius: 28px;
  }

  .scene-stage {
    inset: 0 1.5% 12% 1.5%;
  }

  .scene-copy {
    right: 14%;
  }
}

@media (max-width: 720px) {
  .glass-flower-scene {
    min-height: 44vh;
    border-radius: 24px;
  }

  .scene-copy {
    left: 6%;
    right: 8%;
    bottom: 7%;
  }

  .scene-copy h2 {
    font-size: 1.34rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-stage,
  .scene-mist,
  .scene-copy {
    transition: none;
  }

  .petal-motion,
  .root-filament,
  .center-filament,
  .core-center,
  .core-hotspot,
  .base-spark,
  .core-spark {
    animation: none;
  }
}
</style>
