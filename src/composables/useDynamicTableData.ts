import { computed, ref, watch } from 'vue'
import { dynamicTableDatasets } from '../data/dynamicTableDatasets'
import type { FieldDefinition } from '../types/grid'

export type TableListItem = {
  id: string
  title: string
  description: string
}

/**
 * Loads grid schema + rows for a selected table id.
 * Replace `fetchTableFromStore` with your API (e.g. GET /tables/:id/schema + /tables/:id/rows).
 */
async function fetchTableFromStore(tableId: string): Promise<{
  fields: FieldDefinition[]
  rowData: Record<string, unknown>[]
}> {
  await new Promise((resolve) => setTimeout(resolve, 180))

  const dataset = dynamicTableDatasets.find((d) => d.id === tableId)
  if (!dataset) {
    throw new Error(`Unknown table: ${tableId}`)
  }

  return {
    fields: dataset.fields,
    rowData: dataset.rowData,
  }
}

export function useDynamicTableData(initialTableId?: string) {
  const tableOptions = computed<TableListItem[]>(() =>
    dynamicTableDatasets.map(({ id, title, description }) => ({
      id,
      title,
      description,
    })),
  )

  const selectedTableId = ref(
    initialTableId ?? dynamicTableDatasets[0]?.id ?? '',
  )

  const fields = ref<FieldDefinition[]>([])
  const rowData = ref<Record<string, unknown>[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const selectedTable = computed(() =>
    tableOptions.value.find((t) => t.id === selectedTableId.value),
  )

  async function loadTable(tableId: string) {
    if (!tableId) return

    loading.value = true
    error.value = null

    try {
      const result = await fetchTableFromStore(tableId)
      fields.value = result.fields
      rowData.value = result.rowData
    } catch (e) {
      fields.value = []
      rowData.value = []
      error.value = e instanceof Error ? e.message : 'Failed to load table data'
    } finally {
      loading.value = false
    }
  }

  watch(selectedTableId, (id) => {
    loadTable(id)
  }, { immediate: true })

  return {
    tableOptions,
    selectedTableId,
    selectedTable,
    fields,
    rowData,
    loading,
    error,
    loadTable,
  }
}
