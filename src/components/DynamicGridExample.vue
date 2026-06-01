<script setup lang="ts">
/**
 * Integrated view: Vue → Express API (/api) → Supabase.
 * Grid uses AG Grid server-side pagination (one API request per page).
 */
import type { TableListItem } from '../../shared/api-types'
import { useDynamicTableData } from '../composables/useDynamicTableData'
import {
  DEFAULT_PAGINATION_PAGE_SIZE,
  MIN_ROWS_PER_TABLE,
  PAGINATION_PAGE_SIZE_OPTIONS,
} from '../../shared/constants'
import DynamicAgGrid from './DynamicAgGrid.vue'

const {
  tablesWithData,
  selectedTableId,
  selectedTable,
  fields,
  totalRowCount,
  loading,
  error,
  seedWarning,
  seeding,
  apiConnected,
  readyForGrid,
  reload,
  seedAndReload,
} = useDynamicTableData()

const PAGE_SIZE = DEFAULT_PAGINATION_PAGE_SIZE
const PAGE_SIZE_OPTIONS = [...PAGINATION_PAGE_SIZE_OPTIONS]
const SERVER_GRID_OPTIONS = {
  sideBar: {
    position: 'right',
    toolPanels: [
      {
        id: 'columns',
        labelDefault: 'Columns',
        labelKey: 'columns',
        iconKey: 'columns',
        toolPanel: 'agColumnsToolPanel',
        width: 290,
        toolPanelParams: {
          suppressRowGroups: false,
          suppressValues: false,
          suppressPivots: true,
          suppressPivotMode: true,
          suppressColumnFilter: false,
          suppressColumnSelectAll: false,
          suppressColumnExpandAll: false,
        },
      },
      {
        id: 'filters',
        labelDefault: 'Filters',
        labelKey: 'filters',
        iconKey: 'filter',
        toolPanel: 'agFiltersToolPanel',
        width: 290,
      },
    ],
    defaultToolPanel: 'columns',
  },
  autoGroupColumnDef: {
    headerName: 'Group',
    minWidth: 240,
  },
} as const

function formatTableLabel(opt: TableListItem): string {
  return opt.rowCount > 0 ? `${opt.title} (${opt.rowCount.toLocaleString()})` : opt.title
}

async function runSeed() {
  await seedAndReload()
}
</script>

<template>
  <div class="dynamic-selector page demo-body">
    <header class="demo-toolbar dynamic-selector__toolbar">
      <div class="demo-toolbar__left controls">
        <div v-if="tablesWithData.length" class="demo-field">
          <label class="demo-field__label" for="table-select">Table</label>
          <select
            id="table-select"
            v-model="selectedTableId"
            class="demo-field__select dynamic-selector__select"
            :disabled="loading"
          >
            <option v-for="opt in tablesWithData" :key="opt.id" :value="opt.id">
              {{ formatTableLabel(opt) }}
            </option>
          </select>
        </div>

        <p v-if="selectedTable" class="dynamic-selector__meta">
          {{ selectedTable.description }}
          <span class="dynamic-selector__meta-count">
            · {{ totalRowCount.toLocaleString() }} rows from API / Supabase
            <template v-if="readyForGrid"> · test ready</template>
            · {{ PAGE_SIZE }} rows per API request (pagination)
          </span>
        </p>
      </div>

      <div class="demo-toolbar__right controls">
        <span
          class="dynamic-selector__status"
          :class="apiConnected ? 'dynamic-selector__status--ok' : 'dynamic-selector__status--off'"
        >
          {{ apiConnected ? 'API connected' : 'API offline' }}
        </span>
        <button
          type="button"
          class="dynamic-selector__seed"
          :disabled="loading || seeding"
          @click="runSeed"
        >
          {{ seeding ? 'Seeding…' : 'Seed data' }}
        </button>
        <button
          type="button"
          class="dynamic-selector__reload"
          :disabled="loading || seeding"
          @click="reload"
        >
          {{ loading ? 'Loading…' : 'Reload' }}
        </button>
      </div>
    </header>

    <p v-if="seedWarning && !error" class="dynamic-selector__warn" role="status">
      {{ seedWarning }}
    </p>

    <p v-if="error" class="dynamic-selector__error" role="alert">
      {{ error }}
      <span class="dynamic-selector__error-hint">
        1. <code>npm run dev</code> (frontend + backend)
        2. Run <code>supabase/migrations/001_grid_tables.sql</code> and
        <code>002_disable_rls_for_service.sql</code> in Supabase
        3. Use <strong>service_role</strong> key in <code>.env</code>, then click <strong>Seed data</strong>
      </span>
    </p>

    <div v-else-if="loading && !readyForGrid" class="dynamic-selector__loading">
      Loading schema from backend…
    </div>

    <div class="dynamic-selector__frame grid-frame">
      <DynamicAgGrid
        v-if="readyForGrid"
        :key="`${selectedTableId}-${totalRowCount}-${fields.map((f) => f.field).join(',')}`"
        server-side
        server-side-pagination
        :table-id="selectedTableId"
        :fields="fields"
        :server-row-count="totalRowCount"
        :pagination-page-size="PAGE_SIZE"
        :pagination-page-size-selector="PAGE_SIZE_OPTIONS"
        :cache-block-size="PAGE_SIZE"
        :max-blocks-in-cache="1"
        :grid-options="SERVER_GRID_OPTIONS"
        :toolbar="{ showQuickFilter: true, quickFilterPlaceholder: 'Search via API…' }"
        :default-col-def="{ editable: false, enableRowGroup: true, enableValue: true }"
        :show-sidebar="true"
        :show-row-group-panel="true"
        :row-numbers="false"
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
  max-width: 560px;
  line-height: 1.4;
}

.dynamic-selector__meta-count {
  color: rgba(255, 255, 255, 0.5);
}

.dynamic-selector__status {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid var(--demo-border);
}

.dynamic-selector__status--ok {
  color: #86efac;
  border-color: rgba(134, 239, 172, 0.4);
  background: rgba(34, 197, 94, 0.12);
}

.dynamic-selector__status--off {
  color: #fecaca;
  border-color: rgba(254, 202, 202, 0.35);
  background: rgba(239, 68, 68, 0.12);
}

.dynamic-selector__seed,
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

.dynamic-selector__seed {
  border-color: rgba(134, 239, 172, 0.45);
  color: #86efac;
}

.dynamic-selector__seed:hover:not(:disabled),
.dynamic-selector__reload:hover:not(:disabled) {
  border-color: var(--demo-accent);
}

.dynamic-selector__seed:disabled,
.dynamic-selector__reload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dynamic-selector__warn {
  margin: 0;
  padding: 8px 16px;
  font-size: 13px;
  color: #fde68a;
  background: rgba(234, 179, 8, 0.12);
  border-bottom: 1px solid rgba(234, 179, 8, 0.35);
}

.dynamic-selector__error {
  margin: 0;
  padding: 10px 16px;
  background: rgba(239, 68, 68, 0.15);
  border-bottom: 1px solid rgba(239, 68, 68, 0.35);
  color: #fecaca;
  font-size: 13px;
}

.dynamic-selector__error-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.9;
}

.dynamic-selector__error-hint code {
  color: #fff;
}

.dynamic-selector__loading {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--demo-muted);
}

.dynamic-selector__frame {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
}
</style>
