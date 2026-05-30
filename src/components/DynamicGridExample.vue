<script setup lang="ts">
/**
 * Selector-driven dynamic table — one grid, schema + rows swap when the user picks a table.
 * Data loading is async (see useDynamicTableData) to mirror database/API fetches.
 */
import { useDynamicTableData } from '../composables/useDynamicTableData'
import DynamicAgGrid from './DynamicAgGrid.vue'

const {
  tableOptions,
  selectedTableId,
  selectedTable,
  fields,
  rowData,
  loading,
  error,
  loadTable,
} = useDynamicTableData()
</script>

<template>
  <div class="dynamic-selector page demo-body">
    <header class="demo-toolbar dynamic-selector__toolbar">
      <div class="demo-toolbar__left controls">
        <div class="demo-field">
          <label class="demo-field__label" for="table-select">Table</label>
          <select
            id="table-select"
            v-model="selectedTableId"
            class="demo-field__select dynamic-selector__select"
          >
            <option v-for="opt in tableOptions" :key="opt.id" :value="opt.id">
              {{ opt.title }}
            </option>
          </select>
        </div>

        <p v-if="selectedTable" class="dynamic-selector__meta">
          {{ selectedTable.description }}
          <span class="dynamic-selector__meta-count">
            · {{ rowData.length }} rows
          </span>
        </p>
      </div>

      <div class="demo-toolbar__right">
        <button
          type="button"
          class="dynamic-selector__reload"
          :disabled="loading"
          @click="loadTable(selectedTableId)"
        >
          {{ loading ? 'Loading…' : 'Reload' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="dynamic-selector__error" role="alert">
      {{ error }}
    </p>

    <div class="dynamic-selector__frame grid-frame">
      <DynamicAgGrid
        :key="selectedTableId"
        :fields="fields"
        :row-data="rowData"
        :loading="loading"
        height="100%"
        :toolbar="{ showQuickFilter: true, quickFilterPlaceholder: 'Search rows…' }"
        :default-col-def="{ editable: true }"
        :pagination="true"
        :pagination-page-size="50"
        :pagination-page-size-selector="[25, 50, 100, 200]"
      />
    </div>
  </div>
</template>

<style scoped>
.dynamic-selector {
  height: 100vh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.dynamic-selector__toolbar {
  align-items: center;
}

.dynamic-selector__select {
  min-width: 220px;
}

.dynamic-selector__meta {
  margin: 0;
  align-self: center;
  font-size: 13px;
  color: var(--demo-muted);
  max-width: 480px;
  line-height: 1.4;
}

.dynamic-selector__meta-count {
  color: rgba(255, 255, 255, 0.5);
}

.dynamic-selector__reload {
  min-height: 36px;
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid var(--demo-border);
  background: var(--demo-bg);
  color: var(--demo-fg);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.dynamic-selector__reload:hover:not(:disabled) {
  border-color: var(--demo-accent);
}

.dynamic-selector__reload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dynamic-selector__error {
  margin: 0;
  padding: 10px 16px;
  background: rgba(239, 68, 68, 0.15);
  border-bottom: 1px solid rgba(239, 68, 68, 0.35);
  color: #fecaca;
  font-size: 13px;
}

.dynamic-selector__frame {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
}
</style>
