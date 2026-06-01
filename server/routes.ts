import { Router, type Request, type Response } from 'express'
import type { TableSchemaResponse } from '../shared/api-types.js'
import type { ServerSideRowsRequest } from '../shared/api-types.js'
import { MAX_SERVER_PAGE_SIZE } from '../shared/constants.js'
import {
  fetchTableList,
  getTableFields,
  getTableRowCount,
  queryServerSideRows,
  tableExists,
} from './queryRows.js'
import { seedDatabase, verifyAllTablesMeetMinimum } from './seed.js'
import { checkSupabaseConnection } from './supabase.js'

export const API_VERSION = 3

export const apiRouter = Router()

async function handleSeed(_req: Request, res: Response) {
  try {
    await seedDatabase(true)
    const verification = await verifyAllTablesMeetMinimum()
    res.json({
      ok: verification.ok,
      tables: verification.tables,
      message: verification.ok
        ? 'Seed complete'
        : 'Seed finished but some tables are still empty — check service_role key and migration 002',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Seed failed'
    console.error('[api] seed failed:', message)
    res.status(500).json({ error: message })
  }
}

apiRouter.get('/health', async (_req, res) => {
  try {
    const result = await checkSupabaseConnection()
    if (!result.ok) {
      res.status(503).json({
        ok: false,
        apiVersion: API_VERSION,
        database: 'supabase',
        error: result.error,
      })
      return
    }

    res.json({ ok: true, apiVersion: API_VERSION, database: 'supabase' })
  } catch (e) {
    res.status(503).json({
      ok: false,
      apiVersion: API_VERSION,
      error: e instanceof Error ? e.message : 'Connection failed',
    })
  }
})

apiRouter.all('/seed', handleSeed)

apiRouter.get('/tables', async (_req, res) => {
  try {
    res.json(await fetchTableList())
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to list tables' })
  }
})

apiRouter.get('/tables/:tableId/schema', async (req, res) => {
  try {
    const { tableId } = req.params
    if (!(await tableExists(tableId))) {
      res.status(404).json({ error: 'Table not found' })
      return
    }

    const payload: TableSchemaResponse = {
      fields: await getTableFields(tableId),
      rowCount: await getTableRowCount(tableId),
    }
    res.json(payload)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load schema' })
  }
})

apiRouter.post('/tables/:tableId/rows', async (req, res) => {
  try {
    const { tableId } = req.params
    if (!(await tableExists(tableId))) {
      res.status(404).json({ error: 'Table not found' })
      return
    }

    const body = req.body as ServerSideRowsRequest
    if (
      typeof body.startRow !== 'number' ||
      typeof body.endRow !== 'number' ||
      !Array.isArray(body.sortModel) ||
      (body.rowGroupCols != null && !Array.isArray(body.rowGroupCols)) ||
      (body.valueCols != null && !Array.isArray(body.valueCols)) ||
      (body.pivotCols != null && !Array.isArray(body.pivotCols)) ||
      (body.groupKeys != null && !Array.isArray(body.groupKeys)) ||
      (body.pivotMode != null && typeof body.pivotMode !== 'boolean') ||
      body.startRow < 0 ||
      body.endRow < body.startRow ||
      body.endRow - body.startRow > MAX_SERVER_PAGE_SIZE ||
      (body.quickFilter != null && typeof body.quickFilter !== 'string') ||
      (typeof body.quickFilter === 'string' && body.quickFilter.length > 200) ||
      (body.filterModel != null && typeof body.filterModel !== 'object')
    ) {
      res.status(400).json({ error: 'Invalid server-side request' })
      return
    }

    const fields = await getTableFields(tableId)
    const result = await queryServerSideRows(tableId, fields, body)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load rows' })
  }
})
