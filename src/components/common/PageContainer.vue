<template>
  <section class="page-container">
    <header class="page-header">
      <div>
        <p v-if="eyebrow" class="page-eyebrow">{{ eyebrow }}</p>
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="description" class="page-description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="page-actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="page-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  eyebrow?: string;
}>();
</script>

<style scoped>
.page-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--brand);
}

.page-title {
  margin: 0;
  font-size: clamp(1.5rem, 1.8vw, 2rem);
  line-height: 1.2;
}

.page-description {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.page-actions {
  display: flex;
  gap: 12px;
}

.page-body {
  flex: 1;
  min-height: 0;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .page-actions {
    width: 100%;
  }
}
</style>
