<script setup lang="ts">
import type {
  ColDef,
  ColGroupDef,
  DataTypeDefinition,
  GetRowIdParams,
  GridApi,
  GridOptions,
  GridReadyEvent,
  StatusBar,
  Theme,
} from 'ag-grid-community'
import { colorSchemeDark, colorSchemeLight, themeQuartz } from 'ag-grid-community'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, markRaw, ref, shallowRef, toRef, watch } from 'vue'
import { createServerSideDatasource } from '../composables/createServerSideDatasource'
import type { DynamicAgGridProps } from '../types/grid'
import { DEFAULT_PAGINATION_PAGE_SIZE, PAGINATION_PAGE_SIZE_OPTIONS } from '../../shared/constants'
import { resolveRowId } from '../../shared/rowId'
import { fieldsToColumnDefs } from '../utils/fieldsToColumnDefs'

const props = withDefaults(defineProps<DynamicAgGridProps>(), {
  rowData: () => [],
  loading: false,
  theme: 'quartz-dark',
  height: '100%',
  showSidebar: false,
  showRowGroupPanel: false,
  showStatusBar: true,
  rowNumbers: false,
  pagination: false,
  paginationPageSize: DEFAULT_PAGINATION_PAGE_SIZE,
  paginationPageSizeSelector: () => [...PAGINATION_PAGE_SIZE_OPTIONS],
  toolbar: () => ({ showQuickFilter: false }),
  serverSide: false,
  serverSidePagination: true,
  cacheBlockSize: DEFAULT_PAGINATION_PAGE_SIZE,
  maxBlocksInCache: 1,
})

const emit = defineEmits<{
  gridReady: [api: GridApi]
  quickFilterChange: [text: string]
}>()

const gridApi = shallowRef<GridApi | null>(null)
const internalQuickFilter = ref(props.quickFilterText ?? '')
const tableIdRef = toRef(props, 'tableId')
const datasourceError = ref<string | null>(null)
/** Must stay in sync with AG Grid pagination selector — drives cacheBlockSize via grid remount */
const activePageSize = ref(props.paginationPageSize)
/** Bumped on table/filter changes so stale getRows responses are ignored */
const loadGeneration = ref(0)
let pendingRowIdSeq = 0

const themes = {
  'quartz-dark': themeQuartz.withPart(colorSchemeDark),
  'quartz-light': themeQuartz.withPart(colorSchemeLight),
} as const

const gridTheme = computed<Theme>(() =>
  markRaw(props.themeOverride ?? themes[props.theme]),
)

const columnDefs = computed<Array<ColDef | ColGroupDef>>(() => {
  if (props.columns?.length) return props.columns
  if (props.fields?.length) return fieldsToColumnDefs(props.fields, props.serverSide)
  return []
})

const defaultColDef = computed<ColDef>(() =>
  props.serverSide
    ? {
        ...props.defaultColDef,
        minWidth: props.defaultColDef?.minWidth ?? 80,
        sortable: props.defaultColDef?.sortable ?? true,
        filter: props.defaultColDef?.filter ?? 'agTextColumnFilter',
        floatingFilter: props.defaultColDef?.floatingFilter ?? true,
        cellDataType: false,
        filterParams: {
          debounceMs: 400,
          maxNumConditions: 1,
          ...props.defaultColDef?.filterParams,
        },
        resizable: props.defaultColDef?.resizable ?? true,
        editable: false,
        enableRowGroup: props.defaultColDef?.enableRowGroup ?? true,
        enablePivot: false,
        enableValue: props.defaultColDef?.enableValue ?? true,
      }
    : {
        minWidth: 80,
        sortable: true,
        filter: true,
        floatingFilter: true,
        resizable: true,
        editable: false,
        ...props.defaultColDef,
      },
)

const dataTypeDefinitions = computed<Record<string, DataTypeDefinition>>(() => ({
  currency: {
    baseDataType: 'number',
    extendsDataType: 'number',
    valueFormatter: (p) =>
      typeof p.value === 'number'
        ? p.value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
        : '',
  },
  ...props.dataTypeDefinitions,
}))

/** SSRM: only agSelectedRowCountComponent — agTotalAndFilteredRowCountComponent needs client-side model */
const statusBar = computed<StatusBar | undefined>(() =>
  props.showStatusBar
    ? {
        statusPanels: [
          { statusPanel: 'agSelectedRowCountComponent', align: 'left' },
          ...(props.serverSide
            ? []
            : [
                { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
                { statusPanel: 'agAggregationComponent', align: 'right' },
              ]),
        ],
      }
    : undefined,
)

/** Never return '' — empty ids cause AG Grid warning #205 and ERR rows */
function serverGetRowId(params: GetRowIdParams) {
  const tableId = props.tableId ?? 'grid'
  const data = params.data as Record<string, unknown> | undefined
  const id = resolveRowId(tableId, data)
  if (id) return id
  const nodeId = (params as GetRowIdParams & { node?: { id?: string } }).node?.id
  if (nodeId != null) return `${tableId}:node-${nodeId}`
  pendingRowIdSeq += 1
  return `${tableId}:pending-${pendingRowIdSeq}`
}

/** All SSRM options must be present when the grid is first created (not via setGridOption later). */
watch(
  () => props.paginationPageSize,
  (size) => {
    activePageSize.value = size
  },
)

const serverGridOptions = computed((): GridOptions =>
  markRaw({
    ...props.gridOptions,
    rowModelType: 'serverSide',
    // Must equal pagination page size — one API request per page
    cacheBlockSize: activePageSize.value,
    maxBlocksInCache: props.maxBlocksInCache,
    maxConcurrentDatasourceRequests: 1,
    blockLoadDebounceMillis: 100,
    pagination: props.serverSidePagination,
    paginationPageSize: activePageSize.value,
    paginationPageSizeSelector: props.paginationPageSizeSelector,
    rowSelection: { mode: 'multiRow' },
    autoGroupColumnDef: props.gridOptions?.autoGroupColumnDef ?? {
      minWidth: 220,
    },
    suppressAggFuncInHeader: true,
    animateRows: false,
    paginateChildRows: false,
    serverSideSortAllLevels: true,
    getChildCount: (data) => Number((data as Record<string, unknown>).__childrenCount ?? 0),
    isServerSideGroup: (data) => Boolean((data as Record<string, unknown>).__group),
    getServerSideGroupKey: (data) => String((data as Record<string, unknown>).__groupKey ?? ''),
    sideBar: props.showSidebar ? props.gridOptions?.sideBar ?? true : false,
    rowGroupPanelShow: props.showRowGroupPanel ? 'always' : 'never',
    rowNumbers: props.rowNumbers,
  }),
)

const clientGridOptions = computed((): GridOptions =>
  markRaw({
    ...props.gridOptions,
    sideBar: props.showSidebar ? props.gridOptions?.sideBar ?? true : false,
    rowGroupPanelShow: props.showRowGroupPanel ? 'always' : 'never',
    rowSelection: props.gridOptions?.rowSelection ?? { mode: 'multiRow' },
    rowDragManaged: props.gridOptions?.rowDragManaged ?? true,
    rowNumbers: props.rowNumbers,
    suppressAggFuncInHeader: props.gridOptions?.suppressAggFuncInHeader ?? true,
  }),
)

const fieldsSignature = computed(() =>
  props.fields?.map((f) => f.field).join(',') ?? '',
)

const serverGridKey = computed(
  () =>
    `ssrm-${props.tableId}-${props.serverRowCount}-${activePageSize.value}-${fieldsSignature.value}`,
)

function onPaginationChanged() {
  if (!gridApi.value || !props.serverSide) return
  const size = gridApi.value.paginationGetPageSize()
  if (size > 0 && size !== activePageSize.value) {
    activePageSize.value = size
  }
}

function onServerGridReady(event: GridReadyEvent) {
  gridApi.value = event.api
  datasourceError.value = null

  event.api.setGridOption(
    'serverSideDatasource',
    createServerSideDatasource(tableIdRef, internalQuickFilter, loadGeneration, (msg) => {
      datasourceError.value = msg
    }),
  )

  emit('gridReady', event.api)
}

function onClientGridReady(event: GridReadyEvent) {
  gridApi.value = event.api
  if (internalQuickFilter.value) {
    event.api.setGridOption('quickFilterText', internalQuickFilter.value)
  }
  emit('gridReady', event.api)
}

let quickFilterDebounce: ReturnType<typeof setTimeout> | undefined

watch(internalQuickFilter, () => {
  if (!props.serverSide) {
    gridApi.value?.setGridOption('quickFilterText', internalQuickFilter.value)
  } else {
    loadGeneration.value += 1
    clearTimeout(quickFilterDebounce)
    quickFilterDebounce = setTimeout(() => {
      gridApi.value?.refreshServerSide({ purge: true })
    }, 350)
  }
  emit('quickFilterChange', internalQuickFilter.value)
})

watch(
  () => props.tableId,
  () => {
    loadGeneration.value += 1
    pendingRowIdSeq = 0
    datasourceError.value = null
    internalQuickFilter.value = ''
  },
)

function setQuickFilter(text: string) {
  internalQuickFilter.value = text
}

function getApi() {
  return gridApi.value
}

defineExpose({ getApi, setQuickFilter, api: gridApi })
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
        :placeholder="toolbar.quickFilterPlaceholder ?? 'Search...'"
        spellcheck="false"
      />
    </header>

    <p v-if="datasourceError" class="dynamic-grid__ds-error" role="alert">
      {{ datasourceError }}
    </p>

    <div class="dynamic-grid__body">
      <!-- Server-side: no rowData prop; options fixed at create time -->
      <AgGridVue
        v-if="serverSide && tableId && (serverRowCount ?? 0) > 0"
        :key="serverGridKey"
        class="dynamic-grid__ag"
        :theme="gridTheme"
        :grid-options="serverGridOptions"
        :get-row-id="serverGetRowId"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :status-bar="statusBar"
        :components="components"
        @grid-ready="onServerGridReady"
        @pagination-changed="onPaginationChanged"
      />

      <!-- Client-side fallback -->
      <AgGridVue
        v-else-if="!serverSide"
        class="dynamic-grid__ag"
        :theme="gridTheme"
        :grid-options="clientGridOptions"
        :column-defs="columnDefs"
        :row-data="rowData"
        :loading="loading"
        :default-col-def="defaultColDef"
        :column-types="columnTypes"
        :data-type-definitions="dataTypeDefinitions"
        :components="components"
        :pagination="pagination"
        :pagination-page-size="paginationPageSize"
        :pagination-page-size-selector="paginationPageSizeSelector"
        :status-bar="statusBar"
        @grid-ready="onClientGridReady"
      />
    </div>
  </div>
</template>

<style scoped>
.dynamic-grid {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
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

.dynamic-grid__ds-error {
  margin: 0;
  padding: 8px 12px;
  font-size: 12px;
  color: #fecaca;
  background: rgba(239, 68, 68, 0.15);
}

.dynamic-grid__body {
  flex: 1 1 0;
  min-height: 420px;
  width: 100%;
}

.dynamic-grid__ag {
  width: 100%;
  height: 100%;
  min-height: 420px;
}
</style>
