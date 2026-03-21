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
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const random = createRandom(20260321);

const stars: SceneParticle[] = Array.from({ length: 34 }, (_, index) => {
  const size = 1.5 + random() * 3.8;
  const variant = index % 7 === 0 ? 'star-large' : index % 5 === 0 ? 'star-soft' : '';

  return {
    id: `star-${index}`,
    variant,
    style: {
      left: `${4 + random() * 90}%`,
      top: `${4 + random() * 74}%`,
      width: `${size}px`,
      height: `${size}px`,
      opacity: `${0.2 + random() * 0.75}`,
      animationDelay: `${random() * 14}s`,
      animationDuration: `${8 + random() * 12}s`
    }
  };
});

const meteors: SceneParticle[] = Array.from({ length: 4 }, (_, index) => {
  const width = 60 + random() * 85;

  return {
    id: `meteor-${index}`,
    style: {
      left: `${6 + random() * 78}%`,
      top: `${8 + random() * 42}%`,
      width: `${width}px`,
      animationDelay: `${3 + index * 4 + random() * 3}s`,
      animationDuration: `${10 + random() * 6}s`,
      transform: `rotate(${200 + random() * 18}deg)`
    }
  };
});
</script>

<style scoped>
.star-particle-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.star,
.meteor {
  position: absolute;
  display: block;
}

.star {
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(255, 249, 236, 1) 0%, rgba(222, 241, 255, 0.92) 36%, rgba(255, 255, 255, 0) 100%);
  box-shadow:
    0 0 8px rgba(255, 238, 185, 0.34),
    0 0 18px rgba(131, 187, 255, 0.12);
  animation: twinkle ease-in-out infinite, drift ease-in-out infinite;
}

.star::before,
.star::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 180%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.68), transparent);
  transform: translate(-50%, -50%);
  opacity: 0.3;
}

.star::after {
  width: 1px;
  height: 180%;
}

.star-large {
  box-shadow:
    0 0 12px rgba(255, 233, 178, 0.45),
    0 0 26px rgba(126, 190, 255, 0.22);
}

.star-soft {
  filter: blur(0.2px);
}

.meteor {
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(244, 251, 255, 0.85), rgba(255, 230, 180, 0));
  box-shadow: 0 0 12px rgba(240, 248, 255, 0.28);
  opacity: 0;
  transform-origin: left center;
  animation: meteorTrail linear infinite;
}

.meteor::after {
  content: '';
  position: absolute;
  right: 6%;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transform: translateY(-50%);
  background: radial-gradient(circle, rgba(255, 245, 214, 1), rgba(212, 236, 255, 0.18));
  box-shadow:
    0 0 10px rgba(255, 245, 214, 0.62),
    0 0 16px rgba(167, 207, 255, 0.35);
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.34;
  }

  50% {
    opacity: 1;
  }
}

@keyframes drift {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, -10px, 0);
  }
}

@keyframes meteorTrail {
  0%,
  82% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scaleX(0.86);
  }

  84% {
    opacity: 0.92;
  }

  100% {
    opacity: 0;
    transform: translate3d(-140px, 110px, 0) scaleX(1.14);
  }
}

@media (prefers-reduced-motion: reduce) {
  .star,
  .meteor {
    animation: none;
  }

  .meteor {
    opacity: 0.24;
  }
}
</style>
