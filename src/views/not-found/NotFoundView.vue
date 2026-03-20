<template>
  <div class="not-found shell-card">
    <p class="not-found-kicker">404</p>
    <h1>页面不存在</h1>
    <p>请检查访问路径，或返回地图主页继续操作。</p>
    <RouterLink class="not-found-link" to="/map">返回地图主页</RouterLink>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.not-found {
  width: min(520px, calc(100vw - 32px));
  margin: 12vh auto 0;
  padding: 40px;
  text-align: center;
}

.not-found-kicker {
  margin: 0;
  color: var(--brand);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  margin: 12px 0;
  font-size: 34px;
}

p {
  margin: 0;
  color: var(--text-secondary);
}

.not-found-link {
  display: inline-flex;
  margin-top: 22px;
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
}
</style>
