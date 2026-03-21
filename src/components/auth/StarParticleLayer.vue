<template>
  <div class="star-particle-layer" aria-hidden="true">
    <span
      v-for="star in stars"
      :key="star.id"
      class="star"
      :class="star.variant"
      :style="star.style"
    ></span>
    <span
      v-for="dust in dusts"
      :key="dust.id"
      class="dust"
      :style="dust.style"
    ></span>
    <span
      v-for="meteor in meteors"
      :key="meteor.id"
      class="meteor"
      :style="meteor.style"
    ></span>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';

interface SceneParticle {
  id: string;
  variant?: string;
  style: CSSProperties;
}

function createRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 48271) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const random = createRandom(20260321);

const stars: SceneParticle[] = Array.from({ length: 18 }, (_, index) => {
  const size = 1.2 + random() * 2.2;

  return {
    id: `star-${index}`,
    variant: index % 6 === 0 ? 'star-cross' : '',
    style: {
      left: `${6 + random() * 86}%`,
      top: `${6 + random() * 70}%`,
      width: `${size}px`,
      height: `${size}px`,
      opacity: `${0.24 + random() * 0.46}`,
      animationDelay: `${random() * 8}s`,
      animationDuration: `${6 + random() * 8}s`
    }
  };
});

const dusts: SceneParticle[] = Array.from({ length: 12 }, (_, index) => {
  const size = 2 + random() * 4;

  return {
    id: `dust-${index}`,
    style: {
      left: `${10 + random() * 78}%`,
      top: `${14 + random() * 62}%`,
      width: `${size}px`,
      height: `${size}px`,
      opacity: `${0.08 + random() * 0.14}`,
      animationDelay: `${index * 0.7}s`,
      animationDuration: `${12 + random() * 10}s`
    }
  };
});

const meteors: SceneParticle[] = Array.from({ length: 2 }, (_, index) => ({
  id: `meteor-${index}`,
  style: {
    left: `${14 + index * 34 + random() * 12}%`,
    top: `${10 + index * 12 + random() * 8}%`,
    width: `${72 + random() * 54}px`,
    animationDelay: `${5 + index * 8 + random() * 3}s`,
    animationDuration: `${16 + random() * 6}s`,
    transform: `rotate(${206 + random() * 10}deg)`
  }
}));
</script>

<style scoped>
.star-particle-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.star,
.dust,
.meteor {
  position: absolute;
  display: block;
}

.star {
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 252, 246, 0.96) 0%, rgba(217, 239, 255, 0.76) 38%, rgba(255, 255, 255, 0) 100%);
  box-shadow:
    0 0 6px rgba(255, 240, 191, 0.24),
    0 0 12px rgba(163, 211, 255, 0.08);
  animation: starTwinkle ease-in-out infinite;
}

.star-cross::before,
.star-cross::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.52), transparent);
  transform: translate(-50%, -50%);
  opacity: 0.22;
}

.star-cross::before {
  width: 180%;
  height: 1px;
}

.star-cross::after {
  width: 1px;
  height: 180%;
}

.dust {
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220, 241, 255, 0.62), rgba(255, 255, 255, 0));
  filter: blur(0.6px);
  animation: dustFloat ease-in-out infinite;
}

.meteor {
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(247, 251, 255, 0.76), rgba(255, 230, 188, 0));
  box-shadow: 0 0 10px rgba(233, 244, 255, 0.18);
  opacity: 0;
  transform-origin: left center;
  animation: meteorTrail linear infinite;
}

.meteor::after {
  content: '';
  position: absolute;
  right: 6%;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  transform: translateY(-50%);
  background: radial-gradient(circle, rgba(255, 247, 216, 1), rgba(212, 236, 255, 0.14));
}

@keyframes starTwinkle {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.94);
  }

  50% {
    opacity: 0.92;
    transform: scale(1.08);
  }
}

@keyframes dustFloat {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, -12px, 0);
  }
}

@keyframes meteorTrail {
  0%,
  84% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scaleX(0.88);
  }

  86% {
    opacity: 0.72;
  }

  100% {
    opacity: 0;
    transform: translate3d(-130px, 104px, 0) scaleX(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .star,
  .dust,
  .meteor {
    animation: none;
  }

  .meteor {
    opacity: 0.18;
  }
}
</style>
