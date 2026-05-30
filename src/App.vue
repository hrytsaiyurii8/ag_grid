<script setup lang="ts">
import { ref } from 'vue'
import DynamicGridExample from './components/DynamicGridExample.vue'
import PerformanceGrid from './components/PerformanceGrid.vue'

const mode = ref<'demo' | 'dynamic'>('dynamic')
</script>

<template>
  <div class="app-shell">
    <DynamicGridExample v-if="mode === 'dynamic'" />
  </div>
</template>
<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-nav {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.app-nav__btn {
  padding: 8px 14px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

.app-nav__btn--active {
  background: #2196f3;
  border-color: #2196f3;
  color: #fff;
}
</style>
