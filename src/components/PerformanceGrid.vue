<script setup lang="ts">
import type { ColDef, ColGroupDef, GridApi, GridOptions, ILoadingOverlayComp, ILoadingOverlayParams } from 'ag-grid-community'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createRowItem, extraColumns } from '../data/demoData'
import {
  autoGroupColDef,
  columnTypes,
  dataTypeDefinitions,
  largeColCount,
  largeDefaultCols,
} from '../grid/colDefs'
import { CountryCellRenderer, RatingRenderer } from '../grid/cellRenderers'
import { createDataSizeValue, parseDataSizeValue } from '../utils/pseudoRandom'
import DynamicAgGrid from './DynamicAgGrid.vue'

class LoadingOverlayComponent implements ILoadingOverlayComp {
  private gui?: HTMLElement

  init(_params: ILoadingOverlayParams): void {
    const root = document.createElement('div')
    root.className = 'ag-overlay-loading-center'
    const text = document.createElement('div')
    text.setAttribute('aria-live', 'polite')
    text.textContent = 'Generating rows....'
    root.append(text)
    this.gui = root
  }

  getGui(): HTMLElement {
    return this.gui ?? document.createElement('div')
  }
}

const demoGridOptions: GridOptions = {
  autoGroupColumnDef: autoGroupColDef,
  loadingOverlayComponent: LoadingOverlayComponent,
}

const DEFAULT_COL_COUNT = largeColCount

const defaultCols = ref<(ColDef | ColGroupDef)[]>(largeDefaultCols)
const defaultColCount = ref(DEFAULT_COL_COUNT)
const columnDefs = ref<(ColDef | ColGroupDef)[]>()
const rowData = ref<Record<string, unknown>[]>([])
const isLoading = ref(true)
const dataSize = ref(createDataSizeValue(1000, DEFAULT_COL_COUNT))
const quickFilter = ref('')

const loadInstance = ref(0)
let dataIntervalId: number | null = null
let dataTimeoutId: number | null = null

const gridApi = ref<GridApi | null>(null)

const defaultColDef: ColDef = {
  minWidth: 50,
  editable: true,
  filter: true,
  floatingFilter: true,
  enableCellChangeFlash: true,
}

const gridComponents = {
  CountryCellRenderer,
  RatingRenderer,
}

const dataSizeOptions = [
  { label: '100 Rows, 22 Cols', value: createDataSizeValue(100, DEFAULT_COL_COUNT) },
  { label: '1,000 Rows, 22 Cols', value: createDataSizeValue(1000, DEFAULT_COL_COUNT) },
  { label: '10,000 Rows, 100 Cols', value: createDataSizeValue(10000, 100) },
  { label: '50,000 Rows, 22 Cols', value: createDataSizeValue(50000, DEFAULT_COL_COUNT) },
  { label: '100,000 Rows, 22 Cols', value: createDataSizeValue(100000, DEFAULT_COL_COUNT) },
]

function createCols(colCount: number) {
  const columns: (ColDef | ColGroupDef)[] = defaultCols.value?.slice(0, colCount) ?? []
  const groups = new Map<string, ColDef[]>()

  for (let col = defaultColCount.value; col < colCount; col += 1) {
    const extraColIndex = col - defaultColCount.value
    const colConfig = extraColumns[extraColIndex % extraColumns.length]
    const colDef: ColDef = {
      headerName: colConfig.headerName,
      field: `col${col}`,
      width: 150,
      editable: true,
    }
    switch (colConfig.dataType) {
      case 'currency':
        colDef.cellDataType = 'currency'
        colDef.filter = 'agNumberColumnFilter'
        colDef.width = 160
        break
      case 'percent':
        colDef.filter = 'agNumberColumnFilter'
        colDef.valueFormatter = (params) =>
          params.value != null ? `${(params.value as number).toFixed(1)}%` : ''
        colDef.width = 130
        break
      case 'rating':
        colDef.filter = 'agNumberColumnFilter'
        colDef.width = 120
        break
      case 'text':
        colDef.filter = 'agSetColumnFilter'
        colDef.width = 160
        break
      case 'number':
      default:
        colDef.filter = 'agNumberColumnFilter'
        colDef.width = 140
        break
    }
    const group = colConfig.group
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(colDef)
  }

  for (const [groupName, children] of groups) {
    columns.push({ headerName: groupName, children })
  }
  return columns
}

function createData(newDataSize: string) {
  loadInstance.value += 1
  const loadInstanceCopy = loadInstance.value
  const startTime = Date.now()
  const { cols: colCount, rows: rowCount } = parseDataSizeValue(newDataSize)
  const colDefs = createCols(colCount)

  let row = 0
  const data: Record<string, unknown>[] = []
  const loopCount = rowCount > 10000 ? 10000 : 1000

  if (dataIntervalId) window.clearInterval(dataIntervalId)

  dataIntervalId = window.setInterval(() => {
    if (loadInstanceCopy !== loadInstance.value) {
      if (dataIntervalId) {
        window.clearInterval(dataIntervalId)
        dataIntervalId = null
      }
      return
    }

    for (let i = 0; i < loopCount; i += 1) {
      if (row < rowCount) {
        data.push(
          createRowItem(row, colCount, defaultCols.value?.length ?? 0, defaultColCount.value) as Record<
            string,
            unknown
          >,
        )
        row += 1
      } else break
    }

    if (row >= rowCount) {
      const remainingTime = Math.max(0, 500 - (Date.now() - startTime))
      window.setTimeout(() => {
        isLoading.value = false
        columnDefs.value = colDefs
        rowData.value = data
      }, remainingTime)
      if (dataIntervalId) {
        window.clearInterval(dataIntervalId)
        dataIntervalId = null
      }
    }
  }, 0)
}

function onGridReady(api: GridApi) {
  gridApi.value = api
}

function onDataSizeChange(event: Event) {
  dataSize.value = (event.target as HTMLSelectElement).value
}

watch(dataSize, (value) => {
  if (!value) return
  isLoading.value = true
  if (dataTimeoutId) window.clearTimeout(dataTimeoutId)
  dataTimeoutId = window.setTimeout(() => createData(value), 10)
})

watch(quickFilter, (text) => {
  gridApi.value?.setGridOption('quickFilterText', text)
})

onMounted(() => {
  document.body.classList.add('demo-body')
})

onBeforeUnmount(() => {
  if (dataIntervalId) window.clearInterval(dataIntervalId)
  if (dataTimeoutId) window.clearTimeout(dataTimeoutId)
})
</script>

<template>
  <div class="page exampleWrapper">
    <header class="demo-toolbar toolbar">
      <div class="demo-toolbar__left controls">
        <div class="demo-field group">
          <label class="demo-field__label label" for="data-size">Data Size</label>
          <select
            id="data-size"
            class="demo-field__select select"
            :value="dataSize"
            @change="onDataSizeChange"
          >
            <option v-for="option in dataSizeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="demo-field group">
          <span class="demo-field__label label">Theme</span>
          <select class="demo-field__select select" disabled>
            <option>Quartz</option>
          </select>
        </div>
      </div>
      <div class="demo-toolbar__right searchGroup">
        <label class="label" for="global-filter">Filter</label>
        <input
          id="global-filter"
          v-model="quickFilter"
          class="demo-filter input"
          type="search"
          placeholder="Filter..."
          spellcheck="false"
        />
      </div>
    </header>

    <section class="grid-frame gridWrapper">
      <DynamicAgGrid
        :columns="columnDefs"
        :row-data="rowData"
        :loading="isLoading"
        :default-col-def="defaultColDef"
        :grid-options="demoGridOptions"
        :column-types="columnTypes"
        :data-type-definitions="dataTypeDefinitions"
        :components="gridComponents"
        height="100%"
        @grid-ready="onGridReady"
      />
    </section>
  </div>
</template>
