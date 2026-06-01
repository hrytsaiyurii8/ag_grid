import type {
  ServerSideRowsRequest,
  ServerSideRowsResponse,
  TableListItem,
  TableSchemaResponse,
} from '../../shared/api-types'

/**
 * Dev: call Express on localhost:8080. Some forwarded browser URLs use a
 * 172.x host for Vite, but the API still lives on localhost on this machine.
 * Prod/custom tunnels can set VITE_API_BASE.
 */
function resolveApiBase(): string {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE
  return import.meta.env.DEV ? 'http://localhost:8080' : ''
}

const API_BASE = resolveApiBase()

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!response.ok) {
    if (text.includes('Cannot POST /api/seed') || text.includes('Cannot GET /api')) {
      throw new Error(
        'API route not found. Stop all terminals and run npm run dev (starts Express on port 8080 + Vite).',
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
      'Wrong API is running on port 8080 (outdated server without seed). Run: npm run free-port && npm run dev',
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
  return parseJson(
    await fetch(`${API_BASE}/api/seed`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    }),
  )
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
