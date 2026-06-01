import type {
  ServerSideRowsRequest,
  ServerSideRowsResponse,
  TableListItem,
  TableSchemaResponse,
} from '../../shared/api-types'

/**
 * Dev: call Express on :3001 directly (avoids Vite proxy 404 when only `vite` runs or proxy fails).
 * Prod: same-origin `/api` or set VITE_API_BASE.
 */
const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.DEV ? 'http://localhost:3001' : '')

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!response.ok) {
    if (text.includes('Cannot POST /api/seed') || text.includes('Cannot GET /api')) {
      throw new Error(
        'API route not found. Stop all terminals and run npm run dev (starts Express on port 3001 + Vite).',
      )
    }
    try {
      const err = JSON.parse(text) as { error?: string }
      throw new Error(err.error ?? text)
    } catch (e) {
      if (e instanceof Error && e.message.includes('API route not found')) throw e
      throw new Error(text || `Request failed (${response.status})`)
    }
  }
  return JSON.parse(text) as T
}

export type HealthResponse = {
  ok: boolean
  apiVersion?: number
  database?: string
  error?: string
  dataReady?: boolean
  tables?: { id: string; rowCount: number }[]
}

export async function fetchApiHealth(): Promise<HealthResponse> {
  const health = await parseJson<HealthResponse>(
    await fetch(`${API_BASE}/api/health`, { cache: 'no-store' }),
  )
  if (health.ok && health.apiVersion !== 3) {
    throw new Error(
      'Wrong API is running on port 3001 (outdated server without seed). Run: npm run free-port && npm run dev',
    )
  }
  return health
}

export async function fetchTableList(): Promise<TableListItem[]> {
  return parseJson(await fetch(`${API_BASE}/api/tables`))
}

export type SeedResponse = {
  ok: boolean
  tables: { id: string; rowCount: number }[]
  message?: string
}

export async function fetchSeedDatabase(): Promise<SeedResponse> {
  const opts = { method: 'POST' as const, headers: { Accept: 'application/json' } }
  let response = await fetch(`${API_BASE}/api/seed`, opts)
  if (response.status === 404) {
    response = await fetch(`${API_BASE}/api/seed`, { method: 'GET', headers: opts.headers })
  }
  return parseJson(response)
}

export async function fetchTableSchema(tableId: string): Promise<TableSchemaResponse> {
  return parseJson(
    await fetch(`${API_BASE}/api/tables/${encodeURIComponent(tableId)}/schema`),
  )
}

export async function fetchServerSideRows(
  tableId: string,
  request: ServerSideRowsRequest,
  signal?: AbortSignal,
): Promise<ServerSideRowsResponse> {
  return parseJson(
    await fetch(`${API_BASE}/api/tables/${encodeURIComponent(tableId)}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
      signal,
    }),
  )
}
