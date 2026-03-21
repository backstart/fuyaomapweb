<template>
  <section
    class="glass-flower-scene"
    @pointermove="handlePointerMove"
    @pointerleave="resetPointer"
  >
    <div class="scene-backdrop"></div>
    <div class="scene-nebula nebula-warm" :style="warmNebulaStyle"></div>
    <div class="scene-nebula nebula-cool" :style="coolNebulaStyle"></div>
    <StarParticleLayer />

    <div class="scene-stage" :style="stageStyle">
      <svg
        class="scene-svg"
        viewBox="0 0 920 780"
        role="presentation"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="petalWarm" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.96" />
            <stop offset="38%" stop-color="#fff1d9" stop-opacity="0.74" />
            <stop offset="70%" stop-color="#c4e7ff" stop-opacity="0.26" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
          </linearGradient>
          <linearGradient id="petalCool" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#eaf8ff" stop-opacity="0.94" />
            <stop offset="42%" stop-color="#bbe8ff" stop-opacity="0.52" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.06" />
          </linearGradient>
          <radialGradient id="petalHighlight" cx="50%" cy="24%" r="72%">
            <stop offset="0%" stop-color="#fffdf8" stop-opacity="0.72" />
            <stop offset="50%" stop-color="#fffcf0" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fff8da" stop-opacity="0.98" />
            <stop offset="40%" stop-color="#ffe8ad" stop-opacity="0.74" />
            <stop offset="75%" stop-color="#b5e2ff" stop-opacity="0.24" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="baseGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#b5eaff" stop-opacity="0.62" />
            <stop offset="58%" stop-color="#91ddff" stop-opacity="0.14" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
          <filter id="bloomGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 1.2 0"
            />
          </filter>
          <filter id="reflectionBlur" x="-40%" y="-40%" width="180%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <linearGradient id="reflectionFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
            <stop offset="18%" stop-color="#ffffff" stop-opacity="0.36" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.92" />
          </linearGradient>
          <mask id="reflectionMask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            <rect x="0" y="0" width="920" height="780" fill="black" />
            <rect x="0" y="475" width="920" height="240" fill="url(#reflectionFade)" />
          </mask>
          <clipPath id="reflectionClip">
            <rect x="0" y="472" width="920" height="248" />
          </clipPath>
        </defs>

        <g id="glass-flower">
          <g class="flower-stems">
            <path
              v-for="filament in filaments"
              :key="filament.key"
              class="filament"
              :d="filament.d"
              :style="filament.style"
            />
          </g>

          <ellipse cx="442" cy="575" rx="112" ry="34" class="base-light" />

          <g class="flower-bloom">
            <g
              v-for="petal in outerPetals"
              :key="petal.key"
              :transform="petal.transform"
            >
              <g class="petal-motion" :style="petal.motionStyle">
                <path class="petal-shell" :fill="petal.fill" :opacity="petal.opacity" d="M0 0 C -42 -28 -92 -116 0 -238 C 88 -110 44 -26 0 0 Z" />
                <path class="petal-glint" fill="url(#petalHighlight)" :opacity="petal.highlightOpacity" d="M0 -18 C -24 -52 -35 -122 0 -198 C 35 -124 24 -52 0 -18 Z" />
                <path class="petal-vein" :opacity="petal.strokeOpacity" d="M0 -18 C -9 -78 -10 -150 0 -220 C 10 -150 9 -78 0 -18" />
              </g>
            </g>

            <g
              v-for="petal in middlePetals"
              :key="petal.key"
              :transform="petal.transform"
            >
              <g class="petal-motion petal-motion-mid" :style="petal.motionStyle">
                <path class="petal-shell" :fill="petal.fill" :opacity="petal.opacity" d="M0 0 C -34 -24 -76 -92 0 -196 C 74 -90 36 -24 0 0 Z" />
                <path class="petal-glint" fill="url(#petalHighlight)" :opacity="petal.highlightOpacity" d="M0 -14 C -18 -44 -28 -96 0 -164 C 28 -94 18 -44 0 -14 Z" />
                <path class="petal-vein" :opacity="petal.strokeOpacity" d="M0 -10 C -8 -54 -8 -116 0 -182 C 8 -116 8 -54 0 -10" />
              </g>
            </g>

            <g
              v-for="petal in innerPetals"
              :key="petal.key"
              :transform="petal.transform"
            >
              <g class="petal-motion petal-motion-inner" :style="petal.motionStyle">
                <path class="petal-shell" :fill="petal.fill" :opacity="petal.opacity" d="M0 0 C -24 -18 -56 -72 0 -142 C 55 -70 24 -18 0 0 Z" />
                <path class="petal-glint" fill="url(#petalHighlight)" :opacity="petal.highlightOpacity" d="M0 -8 C -12 -26 -20 -62 0 -110 C 20 -62 12 -26 0 -8 Z" />
                <path class="petal-vein" :opacity="petal.strokeOpacity" d="M0 -6 C -5 -36 -6 -82 0 -132 C 6 -82 5 -36 0 -6" />
              </g>
            </g>
          </g>

          <g class="flower-core">
            <circle cx="444" cy="292" r="72" class="core-center" />
            <circle cx="444" cy="292" r="28" class="core-hotspot" />
            <circle
              v-for="spark in coreSparks"
              :key="spark.key"
              :cx="spark.cx"
              :cy="spark.cy"
              :r="spark.r"
              class="core-spark"
              :style="spark.style"
            />
          </g>
        </g>

        <use href="#glass-flower" class="flower-main"></use>

        <g class="flower-reflection" clip-path="url(#reflectionClip)" mask="url(#reflectionMask)">
          <g transform="translate(0 740) scale(1 -0.56)">
            <use href="#glass-flower"></use>
          </g>
        </g>
      </svg>

      <div class="stage-glow"></div>
      <WaterReflectionLayer />
    </div>

    <div class="scene-copy" :style="copyStyle">
      <p class="scene-kicker">Luminous Spatial Gateway</p>
      <h2>在星光、水影与琉璃花瓣之间，进入地图服务。</h2>
      <p class="scene-description">
        以更柔和的方式进入店铺、区域、导入与管理一体化平台。
      </p>
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
  fill: string;
  opacity: number;
  highlightOpacity: number;
  strokeOpacity: number;
  motionStyle: Record<string, string>;
}

interface FilamentSpec {
  key: string;
  d: string;
  style: Record<string, string>;
}

interface CoreSparkSpec {
  key: string;
  cx: number;
  cy: number;
  r: number;
  style: Record<string, string>;
}

const pointerX = ref(0);
const pointerY = ref(0);
const reducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const outerPetals = buildPetalRing('outer', 13, -122, 122, 150, 0.98, 0.18, ['url(#petalCool)', 'url(#petalWarm)']);
const middlePetals = buildPetalRing('middle', 11, -96, 96, 116, 0.88, 0.14, ['url(#petalWarm)', 'url(#petalCool)']);
const innerPetals = buildPetalRing('inner', 9, -68, 68, 84, 0.74, 0.1, ['url(#petalCool)', 'url(#petalWarm)']);

const filaments: FilamentSpec[] = Array.from({ length: 16 }, (_, index) => {
  const ratio = index / 15;
  const startX = 354 + ratio * 176;
  const startY = 548 + Math.sin(ratio * Math.PI) * 18;
  const controlX1 = startX - 44 + ratio * 18;
  const controlY1 = 504 - ratio * 26;
  const controlX2 = 374 + ratio * 146;
  const controlY2 = 436 - Math.sin(ratio * Math.PI) * 28;
  const endX = 420 + ratio * 70;
  const endY = 356 - Math.cos(ratio * Math.PI) * 22;

  return {
    key: `filament-${index}`,
    d: `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`,
    style: {
      '--delay': `${(index % 6) * 0.7}s`,
      '--sway': `${6 + (index % 4) * 2}px`,
      opacity: `${0.28 + ratio * 0.38}`
    }
  };
});

const coreSparks: CoreSparkSpec[] = Array.from({ length: 15 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 15;
  const distance = 12 + (index % 4) * 10;
  const cx = 444 + Math.cos(angle) * distance;
  const cy = 292 + Math.sin(angle) * distance * 0.66;

  return {
    key: `spark-${index}`,
    cx,
    cy,
    r: 1.8 + (index % 3) * 1.1,
    style: {
      '--delay': `${index * 0.35}s`
    }
  };
});

const stageStyle = computed<Record<string, string>>(() => ({
  transform: reducedMotion
    ? 'translate3d(0, 0, 0)'
    : `translate3d(${pointerX.value * 16}px, ${pointerY.value * 12}px, 0)`
}));

const warmNebulaStyle = computed<Record<string, string>>(() => ({
  transform: reducedMotion
    ? 'translate3d(0, 0, 0)'
    : `translate3d(${pointerX.value * -26}px, ${pointerY.value * -18}px, 0)`
}));

const coolNebulaStyle = computed<Record<string, string>>(() => ({
  transform: reducedMotion
    ? 'translate3d(0, 0, 0)'
    : `translate3d(${pointerX.value * 22}px, ${pointerY.value * 16}px, 0)`
}));

const copyStyle = computed<Record<string, string>>(() => ({
  transform: reducedMotion
    ? 'translate3d(0, 0, 0)'
    : `translate3d(${pointerX.value * 12}px, ${pointerY.value * 10}px, 0)`
}));

function buildPetalRing(
  prefix: string,
  count: number,
  startAngle: number,
  endAngle: number,
  distance: number,
  scaleBase: number,
  scaleVariance: number,
  fills: string[]
): PetalSpec[] {
  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0.5 : index / (count - 1);
    const angle = startAngle + ((endAngle - startAngle) * ratio);
    const symmetryBoost = Math.sin(ratio * Math.PI);
    const scale = scaleBase + symmetryBoost * scaleVariance;

    return {
      key: `${prefix}-${index}`,
      transform: `translate(444 350) rotate(${angle}) translate(0 ${-distance}) scale(${scale})`,
      fill: fills[index % fills.length],
      opacity: 0.56 + symmetryBoost * 0.18,
      highlightOpacity: 0.22 + symmetryBoost * 0.26,
      strokeOpacity: 0.24 + symmetryBoost * 0.22,
      motionStyle: {
        '--delay': `${index * 0.45}s`,
        '--lift': `${8 + symmetryBoost * 7}px`,
        '--drift': `${(ratio - 0.5) * 10}px`
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
  min-height: min(78vh, 860px);
  border-radius: 36px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 42%, rgba(255, 239, 206, 0.06), transparent 26%),
    linear-gradient(180deg, #020304 0%, #05070b 42%, #04080f 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    0 40px 120px rgba(0, 0, 0, 0.38);
}

.scene-backdrop,
.scene-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-backdrop {
  background:
    radial-gradient(circle at 45% 38%, rgba(255, 228, 176, 0.08), transparent 20%),
    radial-gradient(circle at 61% 28%, rgba(164, 214, 255, 0.12), transparent 26%),
    linear-gradient(160deg, rgba(5, 8, 12, 0.98) 0%, rgba(3, 4, 7, 0.92) 45%, rgba(2, 4, 9, 0.98) 100%);
}

.scene-vignette {
  background:
    radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0), rgba(0, 0, 0, 0.08) 48%, rgba(0, 0, 0, 0.64) 100%);
}

.scene-nebula {
  position: absolute;
  inset: auto;
  filter: blur(48px);
  opacity: 0.65;
  transition: transform 420ms ease-out;
  pointer-events: none;
}

.nebula-warm {
  left: 20%;
  top: 15%;
  width: 240px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 226, 168, 0.2), rgba(255, 226, 168, 0.02) 70%, transparent);
}

.nebula-cool {
  left: 44%;
  top: 38%;
  width: 300px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(148, 217, 255, 0.18), rgba(148, 217, 255, 0.03) 72%, transparent);
}

.scene-stage {
  position: absolute;
  inset: 3% 4% 7% 4%;
  transition: transform 480ms ease-out;
}

.scene-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.flower-main {
  filter: url(#bloomGlow);
}

.flower-reflection {
  opacity: 0.34;
  filter: url(#reflectionBlur);
}

.base-light {
  fill: url(#baseGlow);
  opacity: 0.92;
}

.petal-motion,
.filament {
  transform-box: fill-box;
  transform-origin: center bottom;
}

.petal-motion {
  animation: petalBreath 11s ease-in-out infinite var(--delay);
}

.petal-motion-mid {
  animation-duration: 9s;
}

.petal-motion-inner {
  animation-duration: 7.8s;
}

.petal-shell {
  stroke: rgba(242, 247, 255, 0.34);
  stroke-width: 1.2;
  filter: drop-shadow(0 0 12px rgba(255, 236, 188, 0.16));
}

.petal-glint {
  mix-blend-mode: screen;
}

.petal-vein {
  fill: none;
  stroke: rgba(252, 252, 255, 0.44);
  stroke-width: 1;
  stroke-linecap: round;
  filter: drop-shadow(0 0 8px rgba(170, 214, 255, 0.18));
}

.filament {
  fill: none;
  stroke: rgba(176, 227, 255, 0.54);
  stroke-width: 2.2;
  stroke-linecap: round;
  filter: drop-shadow(0 0 8px rgba(118, 207, 255, 0.22));
  animation: filamentSway 12s ease-in-out infinite var(--delay);
}

.flower-core {
  filter: url(#bloomGlow);
}

.core-center {
  fill: url(#coreGlow);
  animation: corePulse 8s ease-in-out infinite;
}

.core-hotspot {
  fill: rgba(255, 248, 221, 0.86);
  opacity: 0.85;
  animation: corePulse 5.5s ease-in-out infinite;
}

.core-spark {
  fill: rgba(255, 248, 214, 0.92);
  filter: drop-shadow(0 0 8px rgba(255, 229, 165, 0.4));
  animation: coreTwinkle 4.4s ease-in-out infinite var(--delay);
}

.stage-glow {
  position: absolute;
  left: 28%;
  right: 22%;
  bottom: 15%;
  height: 22%;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(255, 232, 183, 0.18), rgba(132, 211, 255, 0.08) 38%, rgba(255, 255, 255, 0) 70%);
  filter: blur(22px);
  pointer-events: none;
}

.scene-copy {
  position: absolute;
  left: 7.5%;
  right: 28%;
  bottom: 6.5%;
  z-index: 2;
  color: rgba(244, 247, 255, 0.92);
  transition: transform 480ms ease-out;
}

.scene-kicker {
  margin: 0 0 12px;
  color: rgba(149, 208, 255, 0.76);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}

.scene-copy h2 {
  max-width: 560px;
  margin: 0;
  font-size: clamp(1.7rem, 2vw, 2.6rem);
  line-height: 1.22;
  font-weight: 500;
}

.scene-description {
  max-width: 520px;
  margin: 16px 0 0;
  color: rgba(221, 231, 244, 0.7);
  font-size: 15px;
}

@keyframes petalBreath {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.92;
  }

  50% {
    transform: translate3d(var(--drift), calc(-1 * var(--lift)), 0) scale(1.02);
    opacity: 1;
  }
}

@keyframes filamentSway {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(var(--sway), -4px, 0);
  }
}

@keyframes corePulse {
  0%,
  100% {
    opacity: 0.82;
    transform: scale(0.98);
  }

  50% {
    opacity: 1;
    transform: scale(1.04);
  }
}

@keyframes coreTwinkle {
  0%,
  100% {
    opacity: 0.46;
  }

  50% {
    opacity: 1;
  }
}

@media (max-width: 1080px) {
  .glass-flower-scene {
    min-height: min(54vh, 560px);
    border-radius: 28px;
  }

  .scene-stage {
    inset: 0 1.5% 12% 1.5%;
  }

  .scene-copy {
    left: 6%;
    right: 10%;
    bottom: 6%;
  }
}

@media (max-width: 720px) {
  .glass-flower-scene {
    min-height: 42vh;
    border-radius: 26px;
  }

  .scene-copy {
    right: 8%;
  }

  .scene-copy h2 {
    font-size: 1.4rem;
  }

  .scene-description {
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-nebula,
  .scene-stage,
  .scene-copy {
    transition: none;
  }

  .petal-motion,
  .filament,
  .core-center,
  .core-hotspot,
  .core-spark {
    animation: none;
  }
}
</style>
