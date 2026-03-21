<template>
  <div class="particle-morph-background" aria-hidden="true" @contextmenu.prevent>
    <div ref="hostRef" class="background-stage" :class="{ active: mode === 'webgl' }"></div>

    <div v-if="mode === 'fallback'" class="background-fallback">
      <span
        v-for="dot in fallbackDots"
        :key="dot.id"
        class="fallback-dot"
        :style="dot.style"
      ></span>
      <div class="fallback-ridge ridge-back"></div>
      <div class="fallback-ridge ridge-front"></div>
      <div class="fallback-grid"></div>
    </div>

    <div class="background-haze haze-left"></div>
    <div class="background-haze haze-right"></div>
    <div class="background-vignette"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createParticleMorphScene, supportsWebGL } from '@/components/auth/useParticleMorph';

type RenderMode = 'webgl' | 'fallback';

const hostRef = ref<HTMLDivElement | null>(null);
const mode = ref<RenderMode>('fallback');
let controller: { dispose: () => void } | null = null;

const fallbackDots = [
  { id: 'd1', style: { left: '12%', top: '24%', width: '4px', height: '4px', animationDelay: '0s' } },
  { id: 'd2', style: { left: '24%', top: '18%', width: '3px', height: '3px', animationDelay: '1.8s' } },
  { id: 'd3', style: { left: '38%', top: '30%', width: '4px', height: '4px', animationDelay: '3.6s' } },
  { id: 'd4', style: { left: '64%', top: '20%', width: '4px', height: '4px', animationDelay: '2.4s' } },
  { id: 'd5', style: { left: '74%', top: '34%', width: '3px', height: '3px', animationDelay: '1.2s' } },
  { id: 'd6', style: { left: '84%', top: '28%', width: '4px', height: '4px', animationDelay: '4.2s' } }
];

onMounted(() => {
  if (!supportsWebGL() || !hostRef.value) {
    mode.value = 'fallback';
    return;
  }

  try {
    controller = createParticleMorphScene(hostRef.value);
    mode.value = 'webgl';
  } catch {
    controller?.dispose();
    controller = null;
    mode.value = 'fallback';
  }
});

onBeforeUnmount(() => {
  controller?.dispose();
  controller = null;
});
</script>

<style scoped>
.particle-morph-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 22%, rgba(102, 181, 255, 0.12), transparent 26%),
    radial-gradient(circle at 74% 26%, rgba(138, 233, 255, 0.08), transparent 24%),
    radial-gradient(circle at 50% 84%, rgba(91, 128, 232, 0.1), transparent 22%),
    linear-gradient(180deg, #02050a 0%, #030711 44%, #040913 100%);
}

.background-stage,
.background-fallback,
.background-vignette {
  position: absolute;
  inset: 0;
}

.background-stage {
  opacity: 0;
  transition: opacity 240ms ease;
}

.background-stage.active {
  opacity: 1;
}

.background-stage :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
}

.background-fallback {
  background:
    radial-gradient(circle at 50% 22%, rgba(142, 222, 255, 0.08), transparent 18%),
    linear-gradient(180deg, rgba(6, 12, 24, 0) 0%, rgba(5, 10, 18, 0.3) 72%, rgba(5, 9, 15, 0.72) 100%);
}

.fallback-dot {
  position: absolute;
  display: block;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(243, 251, 255, 0.96), rgba(143, 219, 255, 0.22), rgba(255, 255, 255, 0));
  box-shadow: 0 0 18px rgba(132, 214, 255, 0.18);
  animation: fallbackTwinkle 7s ease-in-out infinite;
}

.fallback-ridge {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.52;
  filter: blur(0.2px);
}

.ridge-back {
  height: 46%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(35, 53, 84, 0.18) 60%, rgba(9, 15, 25, 0.76) 100%);
  clip-path: polygon(0 100%, 0 62%, 11% 54%, 20% 48%, 31% 42%, 43% 46%, 54% 36%, 68% 44%, 80% 38%, 90% 50%, 100% 42%, 100% 100%);
}

.ridge-front {
  height: 34%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(18, 33, 57, 0.22) 50%, rgba(6, 10, 17, 0.9) 100%);
  clip-path: polygon(0 100%, 0 70%, 9% 66%, 18% 58%, 30% 61%, 42% 49%, 52% 54%, 62% 46%, 74% 57%, 86% 50%, 100% 60%, 100% 100%);
}

.fallback-grid {
  position: absolute;
  inset: auto -8% 0 -8%;
  height: 42%;
  background-image:
    linear-gradient(rgba(110, 171, 255, 0.14) 1px, transparent 1px),
    linear-gradient(90deg, rgba(110, 171, 255, 0.14) 1px, transparent 1px);
  background-size: 34px 34px;
  transform: perspective(520px) rotateX(76deg) translateY(46%);
  opacity: 0.16;
  mask-image: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0));
}

.background-haze {
  position: absolute;
  border-radius: 50%;
  filter: blur(78px);
  opacity: 0.4;
  pointer-events: none;
}

.haze-left {
  left: -10%;
  top: 12%;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(74, 154, 255, 0.18), rgba(74, 154, 255, 0.03) 68%, transparent);
}

.haze-right {
  right: -8%;
  top: 20%;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(114, 226, 255, 0.14), rgba(114, 226, 255, 0.02) 70%, transparent);
}

.background-vignette {
  pointer-events: none;
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0) 0%, rgba(3, 7, 12, 0.12) 58%, rgba(0, 0, 0, 0.64) 100%);
}

@keyframes fallbackTwinkle {
  0%,
  100% {
    opacity: 0.24;
    transform: scale(0.94);
  }

  50% {
    opacity: 0.7;
    transform: scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fallback-dot {
    animation: none;
  }
}
</style>
