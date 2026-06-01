import { computed, ref, watch } from 'vue'

import { fetchApiHealth, fetchSeedDatabase, fetchTableList, fetchTableSchema } from '../api/gridApi'

import type { FieldDefinition } from '../types/grid'

import type { TableListItem } from '../../shared/api-types'

import { MIN_ROWS_PER_TABLE } from '../../shared/constants'



export type { TableListItem }



function normalizeRowCount(rowCount: unknown): number | null {

  if (typeof rowCount === 'number' && Number.isFinite(rowCount)) return rowCount

  if (typeof rowCount === 'string' && rowCount !== '') {

    const n = Number(rowCount)

    if (Number.isFinite(n)) return n

  }

  return null

}



function tableHasSelectableData(table: TableListItem): boolean {

  const n = normalizeRowCount(table.rowCount)

  if (n === null) return true

  return n > 0

}



export function useDynamicTableData(initialTableId?: string) {

  const tableOptions = ref<TableListItem[]>([])

  const selectedTableId = ref(initialTableId ?? '')

  const fields = ref<FieldDefinition[]>([])

  const totalRowCount = ref(0)

  const loading = ref(false)

  const error = ref<string | null>(null)

  const seedWarning = ref<string | null>(null)

  const apiConnected = ref(false)

  const databaseReady = ref(false)

  const seeding = ref(false)



  const tablesWithData = computed(() => tableOptions.value.filter(tableHasSelectableData))



  const selectedTable = computed(() =>

    tableOptions.value.find((t) => t.id === selectedTableId.value),

  )



  const readyForGrid = computed(

    () =>

      apiConnected.value &&

      databaseReady.value &&

      !!selectedTableId.value &&

      fields.value.length > 0 &&

      totalRowCount.value > 0,

  )



  async function ensureBackend(): Promise<boolean> {

    try {

      const health = await fetchApiHealth()

      apiConnected.value = health.ok

      if (!health.ok) {

        error.value =

          health.error ??

          'API is running but cannot reach Supabase. Check .env and run the SQL migrations.'

        return false

      }

      return true

    } catch {

      apiConnected.value = false

      error.value =

        'Cannot reach the backend API. Run npm run dev (starts Vite + Express on port 8080).'

      return false

    }

  }



  async function applyTableList(allTables: TableListItem[]) {

    tableOptions.value = allTables.map((t) => ({

      ...t,

      rowCount: normalizeRowCount(t.rowCount) ?? 0,

    }))



    if (!allTables.length) {

      error.value =

        'No tables in database. Click “Seed data” or run migrations + npm run seed.'

      seedWarning.value = null

      databaseReady.value = false

      selectedTableId.value = ''

      return false

    }



    if (!tablesWithData.value.length) {

      return false

    }



    error.value = null

    const stillValid = tablesWithData.value.some((t) => t.id === selectedTableId.value)

    if (!stillValid || !selectedTableId.value) {

      selectedTableId.value = tablesWithData.value[0]!.id

    }

    return true

  }



  async function seedAndReload(): Promise<boolean> {

    seeding.value = true

    error.value = 'Loading demo data…'

    try {

      const result = await fetchSeedDatabase()

      if (!result.ok) {

        error.value =

          'Seed completed but row counts are still low. Run supabase/migrations/002_disable_rls_for_service.sql in Supabase, verify SUPABASE_SERVICE_ROLE_KEY in .env, then click Seed data again.'

        return false

      }

      const allTables = await fetchTableList()
      const ok = await applyTableList(allTables)
      if (ok && selectedTableId.value) {
        await loadTableSchema(selectedTableId.value)
      }
      return ok
    } catch (e) {
      error.value =
        (e instanceof Error ? e.message : 'Seed failed') +
        ' — verify the deployed /api/seed route, Supabase migrations, and service_role key.'
      return false
    } finally {
      seeding.value = false
    }
  }



  async function loadTableList() {
    loading.value = true
    error.value = null

    try {
      if (!(await ensureBackend())) return

      let allTables = await fetchTableList()



      if (allTables.length > 0 && allTables.every((t) => (normalizeRowCount(t.rowCount) ?? 0) === 0)) {

        const seeded = await seedAndReload()

        if (!seeded) return

        allTables = tableOptions.value

      }



      const ok = await applyTableList(allTables)

      if (!ok && allTables.length > 0) {

        error.value =

          'Tables exist but have no rows. Click “Seed data” (check API terminal for errors).'

      }

    } catch (e) {

      error.value = e instanceof Error ? e.message : 'Failed to load table list'

      databaseReady.value = false
    } finally {
      loading.value = false

    }

  }



  let schemaRequestId = 0



  async function loadTableSchema(tableId: string) {

    if (!tableId) return

    if (!(await ensureBackend())) return



    const requestId = ++schemaRequestId

    loading.value = true

    error.value = null

    seedWarning.value = null



    try {

      const schema = await fetchTableSchema(tableId)

      if (requestId !== schemaRequestId || selectedTableId.value !== tableId) return



      fields.value = schema.fields

      totalRowCount.value = schema.rowCount



      const listEntry = tableOptions.value.find((t) => t.id === tableId)

      if (listEntry) listEntry.rowCount = schema.rowCount



      if (schema.rowCount <= 0) {

        databaseReady.value = false

        error.value = `Table "${tableId}" has no rows. Click “Seed data” to load demo rows.`

        fields.value = []

        return

      }



      databaseReady.value = true

      error.value = null



      if (schema.rowCount < MIN_ROWS_PER_TABLE) {

        seedWarning.value = `This table has ${schema.rowCount.toLocaleString()} rows (recommended: ${MIN_ROWS_PER_TABLE}+). Click “Seed data” for a full dataset.`

      }

    } catch (e) {

      if (requestId !== schemaRequestId) return

      fields.value = []

      totalRowCount.value = 0

      databaseReady.value = false

      error.value = e instanceof Error ? e.message : 'Failed to load table schema'

    } finally {

      if (requestId === schemaRequestId) {

        loading.value = false

      }

    }

  }



  async function reload() {

    await loadTableList()

    if (selectedTableId.value) await loadTableSchema(selectedTableId.value)

  }



  watch(selectedTableId, (id) => {

    if (id) loadTableSchema(id)

  })



  loadTableList()



  return {

    tableOptions,

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

    databaseReady,

    readyForGrid,

    reload,

    seedAndReload,

    loadTableSchema,

  }

}


