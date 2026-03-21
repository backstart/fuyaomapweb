<template>
  <div class="fluid-background">
    <canvas
      v-show="renderMode === 'webgl'"
      ref="canvasRef"
      class="fluid-canvas"
      aria-hidden="true"
    />
    <div v-if="renderMode === 'fallback'" class="fallback-layer" aria-hidden="true">
      <span class="fallback-blob blob-a"></span>
      <span class="fallback-blob blob-b"></span>
      <span class="fallback-blob blob-c"></span>
    </div>
    <div class="ambient-tint"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

type RenderMode = 'webgl' | 'fallback';

interface FluidParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  alpha: number;
  color: [number, number, number];
}

interface WebGlRenderer {
  stop: () => void;
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const renderMode = ref<RenderMode>('fallback');

const palette: Array<[number, number, number]> = [
  [0.12, 0.57, 0.98],
  [0.19, 0.88, 0.9],
  [0.56, 0.52, 0.98],
  [0.32, 0.74, 0.96]
];

let renderer: WebGlRenderer | null = null;

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) {
    renderMode.value = 'fallback';
    return;
  }

  renderer = createWebGlRenderer(canvas);
  renderMode.value = renderer ? 'webgl' : 'fallback';
});

onBeforeUnmount(() => {
  renderer?.stop();
  renderer = null;
});

function createWebGlRenderer(canvas: HTMLCanvasElement): WebGlRenderer | null {
  const webGlContext = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true
  });

  if (!webGlContext) {
    return null;
  }

  const gl = webGlContext;

  const fadeProgram = createProgram(
    gl,
    `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `,
    `
      precision mediump float;
      varying vec2 v_uv;
      uniform vec4 u_tint;
      void main() {
        float vignette = smoothstep(1.15, 0.18, distance(v_uv, vec2(0.5)));
        gl_FragColor = vec4(u_tint.rgb, u_tint.a * vignette);
      }
    `
  );

  const pointProgram = createProgram(
    gl,
    `
      attribute vec2 a_position;
      attribute float a_size;
      attribute vec4 a_color;
      uniform vec2 u_resolution;
      varying vec4 v_color;
      void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 clip = zeroToOne * 2.0 - 1.0;
        gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
        gl_PointSize = a_size;
        v_color = a_color;
      }
    `,
    `
      precision mediump float;
      varying vec4 v_color;
      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float dist = length(centered) * 2.0;
        float base = smoothstep(1.05, 0.0, dist);
        float core = smoothstep(0.5, 0.0, dist);
        vec3 color = v_color.rgb * (0.55 + core * 0.8);
        gl_FragColor = vec4(color, v_color.a * base * base);
      }
    `
  );

  if (!fadeProgram || !pointProgram) {
    return null;
  }

  const quadBuffer = gl.createBuffer();
  const pointBuffer = gl.createBuffer();
  if (!quadBuffer || !pointBuffer) {
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]),
    gl.STATIC_DRAW
  );

  const fadePositionLocation = gl.getAttribLocation(fadeProgram, 'a_position');
  const fadeTintLocation = gl.getUniformLocation(fadeProgram, 'u_tint');
  const pointPositionLocation = gl.getAttribLocation(pointProgram, 'a_position');
  const pointSizeLocation = gl.getAttribLocation(pointProgram, 'a_size');
  const pointColorLocation = gl.getAttribLocation(pointProgram, 'a_color');
  const pointResolutionLocation = gl.getUniformLocation(pointProgram, 'u_resolution');

  if (
    fadePositionLocation < 0 ||
    !fadeTintLocation ||
    pointPositionLocation < 0 ||
    pointSizeLocation < 0 ||
    pointColorLocation < 0 ||
    !pointResolutionLocation
  ) {
    return null;
  }

  const particles: FluidParticle[] = [];
  let animationFrameId = 0;
  let width = 0;
  let height = 0;
  let lastFrameTime = performance.now();
  let ambientElapsed = 0;
  let pointerWasActive = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  const maxParticles = 180;

  const handlePointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (width / Math.max(rect.width, 1));
    const y = (event.clientY - rect.top) * (height / Math.max(rect.height, 1));
    if (!pointerWasActive) {
      pointerWasActive = true;
      lastPointerX = x;
      lastPointerY = y;
      spawnBurst(x, y, 0, 0, 4);
      return;
    }

    const dx = x - lastPointerX;
    const dy = y - lastPointerY;
    lastPointerX = x;
    lastPointerY = y;

    if (Math.abs(dx) + Math.abs(dy) < 1) {
      return;
    }

    spawnBurst(x, y, dx, dy, 6);
  };

  const handlePointerLeave = () => {
    pointerWasActive = false;
  };

  const resize = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
    const nextWidth = Math.max(1, Math.floor(window.innerWidth * pixelRatio));
    const nextHeight = Math.max(1, Math.floor(window.innerHeight * pixelRatio));
    if (width === nextWidth && height === nextHeight) {
      return;
    }

    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const frame = (time: number) => {
    const delta = Math.min(40, time - lastFrameTime || 16);
    lastFrameTime = time;
    ambientElapsed += delta;

    resize();
    if (ambientElapsed >= 48) {
      ambientElapsed = 0;
      spawnAmbient(time);
    }

    updateParticles(delta, time);
    drawScene();
    animationFrameId = window.requestAnimationFrame(frame);
  };

  function spawnAmbient(time: number): void {
    const t = time * 0.00022;
    emitParticle(
      width * (0.22 + 0.14 * Math.sin(t * 1.3)),
      height * (0.28 + 0.12 * Math.cos(t * 1.1)),
      0.02,
      -0.01,
      110 + 40 * Math.sin(t * 2.2),
      0.8,
      0.045,
      palette[0]
    );
    emitParticle(
      width * (0.72 + 0.1 * Math.cos(t * 1.7)),
      height * (0.64 + 0.14 * Math.sin(t * 1.4)),
      -0.015,
      0.018,
      130 + 30 * Math.cos(t * 1.5),
      0.9,
      0.055,
      palette[2]
    );
  }

  function spawnBurst(x: number, y: number, dx: number, dy: number, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      emitParticle(
        x + (Math.random() - 0.5) * 24,
        y + (Math.random() - 0.5) * 24,
        dx * 0.02 + (Math.random() - 0.5) * 0.8,
        dy * 0.02 + (Math.random() - 0.5) * 0.8,
        85 + Math.random() * 90,
        0.75 + Math.random() * 0.35,
        0.06 + Math.random() * 0.05,
        color
      );
    }
  }

  function emitParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    life: number,
    alpha: number,
    color: [number, number, number]
  ): void {
    particles.push({
      x,
      y,
      vx,
      vy,
      size,
      life,
      alpha,
      color
    });

    while (particles.length > maxParticles) {
      particles.shift();
    }
  }

  function updateParticles(delta: number, time: number): void {
    const drag = Math.pow(0.985, delta / 16);
    const timeFactor = time * 0.0011;

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      const flowX = Math.sin((particle.y * 0.003) + timeFactor) * 0.012;
      const flowY = Math.cos((particle.x * 0.003) - timeFactor * 0.85) * 0.012;

      particle.vx = (particle.vx + flowX * delta) * drag;
      particle.vy = (particle.vy + flowY * delta) * drag;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.life -= delta * 0.00026;
      particle.size *= Math.pow(0.9986, delta);

      if (
        particle.life <= 0 ||
        particle.size < 8 ||
        particle.x < -particle.size ||
        particle.x > width + particle.size ||
        particle.y < -particle.size ||
        particle.y > height + particle.size
      ) {
        particles.splice(index, 1);
      }
    }
  }

  function drawScene(): void {
    gl.viewport(0, 0, width, height);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    gl.useProgram(fadeProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(fadePositionLocation);
    gl.vertexAttribPointer(fadePositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform4f(fadeTintLocation, 0.03, 0.06, 0.11, 0.085);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (particles.length === 0) {
      return;
    }

    const vertexData = new Float32Array(particles.length * 7);
    particles.forEach((particle, index) => {
      const offset = index * 7;
      vertexData[offset] = particle.x;
      vertexData[offset + 1] = particle.y;
      vertexData[offset + 2] = particle.size;
      vertexData[offset + 3] = particle.color[0];
      vertexData[offset + 4] = particle.color[1];
      vertexData[offset + 5] = particle.color[2];
      vertexData[offset + 6] = particle.alpha * Math.max(0, Math.min(1, particle.life));
    });

    gl.useProgram(pointProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
    gl.uniform2f(pointResolutionLocation, width, height);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const stride = 7 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(pointPositionLocation);
    gl.vertexAttribPointer(pointPositionLocation, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(pointSizeLocation);
    gl.vertexAttribPointer(pointSizeLocation, 1, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(pointColorLocation);
    gl.vertexAttribPointer(pointColorLocation, 4, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.drawArrays(gl.POINTS, 0, particles.length);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerleave', handlePointerLeave);
  canvas.addEventListener('webglcontextlost', handlePointerLeave);
  animationFrameId = window.requestAnimationFrame(frame);

  return {
    stop() {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('webglcontextlost', handlePointerLeave);
      particles.length = 0;
    }
  };
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}
</script>

<style scoped>
.fluid-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(58, 110, 214, 0.28), transparent 36%),
    radial-gradient(circle at right top, rgba(56, 185, 217, 0.18), transparent 28%),
    linear-gradient(135deg, #061120 0%, #091728 42%, #0b1424 100%);
}

.fluid-canvas,
.fallback-layer,
.ambient-tint {
  position: absolute;
  inset: 0;
}

.fluid-canvas {
  width: 100%;
  height: 100%;
  opacity: 0.92;
}

.ambient-tint {
  pointer-events: none;
  background:
    radial-gradient(circle at 20% 18%, rgba(74, 144, 255, 0.14), transparent 24%),
    radial-gradient(circle at 82% 28%, rgba(101, 191, 255, 0.12), transparent 20%),
    radial-gradient(circle at 54% 74%, rgba(128, 122, 255, 0.09), transparent 18%);
}

.fallback-layer {
  background:
    linear-gradient(135deg, rgba(11, 21, 35, 0.9) 0%, rgba(8, 18, 31, 0.82) 100%);
}

.fallback-blob {
  position: absolute;
  width: 44vw;
  height: 44vw;
  border-radius: 50%;
  filter: blur(36px);
  opacity: 0.3;
  mix-blend-mode: screen;
  animation: drift 18s ease-in-out infinite;
}

.blob-a {
  left: -10vw;
  top: -8vw;
  background: radial-gradient(circle, rgba(74, 144, 255, 0.86), transparent 64%);
}

.blob-b {
  right: -8vw;
  top: 8vh;
  background: radial-gradient(circle, rgba(93, 229, 228, 0.74), transparent 60%);
  animation-duration: 24s;
}

.blob-c {
  left: 30vw;
  bottom: -16vw;
  background: radial-gradient(circle, rgba(137, 115, 255, 0.62), transparent 58%);
  animation-duration: 21s;
}

@keyframes drift {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  33% {
    transform: translate3d(6vw, 5vh, 0) scale(1.08);
  }

  66% {
    transform: translate3d(-4vw, 8vh, 0) scale(0.94);
  }
}
</style>
