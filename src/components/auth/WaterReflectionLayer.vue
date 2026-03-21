<template>
  <div class="water-reflection-layer" aria-hidden="true">
    <canvas
      v-show="renderMode === 'canvas'"
      ref="canvasRef"
      class="water-canvas"
    ></canvas>
    <div v-if="renderMode === 'fallback'" class="water-fallback"></div>
    <div class="water-haze"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

type RenderMode = 'canvas' | 'fallback';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const renderMode = ref<RenderMode>('fallback');

let frameId = 0;
let resizeObserver: ResizeObserver | null = null;
let resizeHandler: (() => void) | null = null;

onMounted(() => {
  const canvas = canvasRef.value;
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    renderMode.value = 'fallback';
    return;
  }

  renderMode.value = 'canvas';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parent = canvas.parentElement;
  let width = 0;
  let height = 0;

  const resize = () => {
    if (!parent) {
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, Math.floor(parent.clientWidth * pixelRatio));
    height = Math.max(1, Math.floor(parent.clientHeight * pixelRatio));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${parent.clientWidth}px`;
    canvas.style.height = `${parent.clientHeight}px`;
  };

  const draw = (time: number) => {
    if (!width || !height) {
      resize();
    }

    context.clearRect(0, 0, width, height);

    const baseGradient = context.createLinearGradient(0, 0, 0, height);
    baseGradient.addColorStop(0, 'rgba(167, 212, 255, 0.00)');
    baseGradient.addColorStop(0.28, 'rgba(42, 66, 96, 0.08)');
    baseGradient.addColorStop(0.7, 'rgba(9, 18, 30, 0.22)');
    baseGradient.addColorStop(1, 'rgba(3, 8, 14, 0.62)');
    context.fillStyle = baseGradient;
    context.fillRect(0, 0, width, height);

    const phase = time * 0.001;
    context.save();
    context.globalCompositeOperation = 'screen';

    for (let lineIndex = 0; lineIndex < 20; lineIndex += 1) {
      const ratio = lineIndex / 19;
      const y = height * (0.12 + ratio * 0.82);
      const amplitude = 3 + ratio * 14;
      const wavelength = 0.012 + ratio * 0.004;
      const opacity = 0.035 + (1 - ratio) * 0.06;

      context.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const waveY = y + Math.sin((x * wavelength) + phase * (0.55 + ratio * 0.25)) * amplitude;
        if (x === 0) {
          context.moveTo(x, waveY);
        } else {
          context.lineTo(x, waveY);
        }
      }

      context.strokeStyle = `rgba(202, 228, 255, ${opacity})`;
      context.lineWidth = 0.8 + ratio * 1.1;
      context.stroke();
    }

    const bloomX = width * 0.46;
    const bloomY = height * 0.24;
    const bloomGradient = context.createRadialGradient(bloomX, bloomY, 0, bloomX, bloomY, width * 0.16);
    bloomGradient.addColorStop(0, 'rgba(255, 241, 205, 0.18)');
    bloomGradient.addColorStop(0.55, 'rgba(182, 228, 255, 0.08)');
    bloomGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = bloomGradient;
    context.beginPath();
    context.ellipse(bloomX, bloomY, width * 0.16, height * 0.12, 0, 0, Math.PI * 2);
    context.fill();

    context.filter = 'blur(12px)';
    for (let shimmerIndex = 0; shimmerIndex < 8; shimmerIndex += 1) {
      const x = width * (0.14 + shimmerIndex * 0.1 + Math.sin(phase * 0.26 + shimmerIndex) * 0.02);
      const y = height * (0.28 + shimmerIndex * 0.075 + Math.cos(phase * 0.48 + shimmerIndex) * 0.035);
      const radiusX = width * (0.038 + shimmerIndex * 0.007);
      const radiusY = 4.5 + shimmerIndex * 0.8;

      context.beginPath();
      context.fillStyle = `rgba(247, 238, 210, ${0.04 + shimmerIndex * 0.014})`;
      context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
      context.fill();
    }

    context.filter = 'blur(1px)';
    for (let sparkleIndex = 0; sparkleIndex < 9; sparkleIndex += 1) {
      const x = width * (0.2 + sparkleIndex * 0.07 + Math.sin(phase * 0.62 + sparkleIndex * 1.3) * 0.014);
      const y = height * (0.38 + (sparkleIndex % 4) * 0.1 + Math.cos(phase * 0.78 + sparkleIndex) * 0.018);
      context.beginPath();
      context.fillStyle = `rgba(255, 247, 222, ${0.1 + (sparkleIndex % 3) * 0.04})`;
      context.ellipse(x, y, 1.8 + (sparkleIndex % 2), 0.8 + (sparkleIndex % 2) * 0.25, 0, 0, Math.PI * 2);
      context.fill();
    }

    context.filter = 'none';
    context.restore();

    if (!prefersReducedMotion) {
      frameId = window.requestAnimationFrame(draw);
    }
  };

  resize();
  if (typeof ResizeObserver !== 'undefined' && parent) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
  } else {
    resizeHandler = resize;
    window.addEventListener('resize', resize);
  }

  draw(0);
});

onBeforeUnmount(() => {
  if (frameId) {
    window.cancelAnimationFrame(frameId);
  }

  resizeObserver?.disconnect();
  resizeObserver = null;
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
});
</script>

<style scoped>
.water-reflection-layer {
  position: absolute;
  inset: auto 0 0 0;
  height: 31%;
  overflow: hidden;
  pointer-events: none;
  mask-image: linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.2) 18%, rgba(255, 255, 255, 0.94) 100%);
}

.water-canvas,
.water-fallback,
.water-haze {
  position: absolute;
  inset: 0;
}

.water-canvas {
  width: 100%;
  height: 100%;
  opacity: 0.92;
}

.water-fallback {
  background:
    repeating-linear-gradient(
      180deg,
      rgba(198, 225, 255, 0.08) 0,
      rgba(198, 225, 255, 0.08) 1px,
      rgba(10, 19, 31, 0) 10px
    ),
    linear-gradient(180deg, rgba(182, 215, 255, 0.05) 0%, rgba(5, 14, 24, 0.46) 100%);
  animation: fallbackWater 12s linear infinite;
}

.water-haze {
  background:
    linear-gradient(180deg, rgba(10, 19, 31, 0) 0%, rgba(3, 7, 14, 0.2) 30%, rgba(3, 7, 14, 0.62) 100%),
    radial-gradient(circle at 50% 8%, rgba(255, 233, 182, 0.08), transparent 34%);
  mix-blend-mode: screen;
}

@keyframes fallbackWater {
  0% {
    background-position: 0 0, 0 0;
  }

  100% {
    background-position: 0 20px, 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .water-fallback {
    animation: none;
  }
}
</style>
