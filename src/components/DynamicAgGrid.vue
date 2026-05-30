<script setup lang="ts">
import type {
  ColDef,
  ColGroupDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  SideBarDef,
  StatusBar,
  Theme,
} from 'ag-grid-community'
import { colorSchemeDark, colorSchemeLight, themeQuartz } from 'ag-grid-community'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, ref, shallowRef, watch } from 'vue'
import type { DynamicAgGridProps } from '../types/grid'
import { fieldsToColumnDefs } from '../utils/fieldsToColumnDefs'

const props = withDefaults(defineProps<DynamicAgGridProps>(), {
  rowData: () => [],
  loading: false,
  theme: 'quartz-dark',
  height: '100%',
  showSidebar: true,
  showRowGroupPanel: true,
  showStatusBar: true,
  rowNumbers: true,
  pagination: false,
  paginationPageSize: 100,
  paginationPageSizeSelector: () => [50, 100, 200, 500],
  toolbar: () => ({ showQuickFilter: false }),
})

const emit = defineEmits<{
  gridReady: [api: GridApi]
  quickFilterChange: [text: string]
}>()

const gridApi = shallowRef<GridApi | null>(null)
const internalQuickFilter = ref(props.quickFilterText ?? '')

const themes = {
  'quartz-dark': themeQuartz.withPart(colorSchemeDark),
  'quartz-light': themeQuartz.withPart(colorSchemeLight),
} as const

const gridTheme = computed<Theme>(() => props.themeOverride ?? themes[props.theme])

const columnDefs = computed<Array<ColDef | ColGroupDef>>(() => {
  if (props.columns?.length) return props.columns
  if (props.fields?.length) return fieldsToColumnDefs(props.fields)
  return []
})

const mergedDefaultColDef = computed<ColDef>(() => ({
  minWidth: 80,
  sortable: true,
  filter: true,
  floatingFilter: true,
  resizable: true,
  editable: false,
  enableRowGroup: true,
  enablePivot: true,
  enableValue: true,
  ...props.defaultColDef,
}))

const sideBar = computed<SideBarDef | false>(() =>
  props.showSidebar
    ? {
        toolPanels: ['columns', 'filters-new'],
        position: 'right',
        defaultToolPanel: 'columns',
        hiddenByDefault: false,
      }
    : false,
)

const statusBar = computed<StatusBar | undefined>(() =>
  props.showStatusBar
    ? {
        statusPanels: [
          {
            statusPanel: 'agTotalAndFilteredRowCountComponent',
            key: 'totalAndFilter',
            align: 'left',
          },
          { statusPanel: 'agSelectedRowCountComponent', align: 'left' },
          { statusPanel: 'agAggregationComponent', align: 'right' },
        ],
      }
    : undefined,
)

const baseGridOptions = computed<GridOptions>(() => ({
  cellSelection: {
    enableHeaderHighlight: true,
    handle: { mode: 'fill' },
  },
  rowSelection: { mode: 'multiRow' },
  pivotPanelShow: 'always',
  undoRedoCellEditing: true,
  undoRedoCellEditingLimit: 50,
  enableFilterHandlers: true,
  rowDragManaged: true,
  rowDragMultiRow: true,
  suppressAggFuncInHeader: true,
  ...props.gridOptions,
}))

watch(
  () => props.quickFilterText,
  (text) => {
    if (text !== undefined) internalQuickFilter.value = text
  },
)

watch(internalQuickFilter, (text) => {
  gridApi.value?.setGridOption('quickFilterText', text)
  emit('quickFilterChange', text)
})

function onGridReady(event: GridReadyEvent) {
  gridApi.value = event.api
  if (internalQuickFilter.value) {
    event.api.setGridOption('quickFilterText', internalQuickFilter.value)
  }
  if (window.innerWidth <= 1024 && props.showSidebar) {
    event.api.closeToolPanel()
  }
  emit('gridReady', event.api)
}

function setQuickFilter(text: string) {
  internalQuickFilter.value = text
}

function getApi() {
  return gridApi.value
}

defineExpose({
  getApi,
  setQuickFilter,
  api: gridApi,
})
</script>

<template>
  <div class="dynamic-grid" :class="props.class" :style="{ height: props.height }">
    <header v-if="toolbar?.showQuickFilter" class="dynamic-grid__toolbar">
      <label class="dynamic-grid__filter-label" for="dynamic-grid-quick-filter">Filter</label>
      <input
        id="dynamic-grid-quick-filter"
        v-model="internalQuickFilter"
        class="dynamic-grid__filter-input"
        type="search"
        :placeholder="toolbar.quickFilterPlaceholder ?? 'Filter...'"
        spellcheck="false"
      />
    </header>

    <div class="dynamic-grid__body">
      <AgGridVue
        class="dynamic-grid__ag"
        :style="{ height: toolbar?.showQuickFilter ? 'calc(100% - 52px)' : '100%' }"
        :grid-options="baseGridOptions"
        :theme="gridTheme"
        :column-defs="columnDefs"
        :row-data="rowData"
        :loading="loading"
        :default-col-def="mergedDefaultColDef"
        :side-bar="sideBar"
        :status-bar="statusBar"
        :column-types="columnTypes"
        :data-type-definitions="dataTypeDefinitions"
        :components="components"
        :row-numbers="rowNumbers"
        :row-group-panel-show="showRowGroupPanel ? 'always' : undefined"
        :pagination="pagination"
        :pagination-page-size="paginationPageSize"
        :pagination-page-size-selector="paginationPageSizeSelector"
        @grid-ready="onGridReady"
      />
    </div>
  </div>
</template>

<style scoped>
.dynamic-grid {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  width: 100%;
}

.dynamic-grid__toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--demo-header, #1e2a3a);
  border-bottom: 1px solid var(--demo-border, rgba(255, 255, 255, 0.16));
}

.dynamic-grid__filter-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--demo-muted, rgba(255, 255, 255, 0.7));
}

.dynamic-grid__filter-input {
  flex: 1;
  max-width: 320px;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 4px;
  border: 1px solid var(--demo-border, rgba(255, 255, 255, 0.16));
  background: var(--demo-bg, #182230);
  color: var(--demo-fg, #fff);
  font: inherit;
}

.dynamic-grid__filter-input:focus {
  outline: none;
  border-color: var(--demo-accent, #2196f3);
  box-shadow: 0 0 0 3px color-mix(in srgb, transparent, #2196f3 35%);
}

.dynamic-grid__body {
  flex: 1 1 auto;
  min-height: 0;
}

.dynamic-grid__ag {
  width: 100%;
}
</style>
