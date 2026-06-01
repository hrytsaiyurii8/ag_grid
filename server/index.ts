import cors from 'cors'
import express from 'express'
import { apiRouter, API_VERSION } from './routes.js'
import { seedDatabase, verifyAllTablesMeetMinimum } from './seed.js'
import { checkSupabaseConnection } from './supabase.js'

const PORT = Number(process.env.PORT ?? 3001)

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use('/api', apiRouter)

async function ensureDatabaseSeeded() {
  try {
    const verification = await verifyAllTablesMeetMinimum()
    if (verification.ok) {
      console.log('[api] Database ready (all tables seeded)')
      return
    }
    console.log('[api] Database needs seed — loading demo data…')
    await seedDatabase(true)
    const after = await verifyAllTablesMeetMinimum()
    if (after.ok) {
      console.log('[api] Seed complete')
    } else {
      console.warn('[api] Seed finished but some tables are still below minimum row count')
      after.tables.forEach((t) => console.warn(`  · ${t.id}: ${t.rowCount} rows`))
    }
  } catch (e) {
    console.error(
      '[api] Auto-seed skipped:',
      e instanceof Error ? e.message : e,
      '— run migrations and npm run seed',
    )
  }
}

function startServer() {
  const server = app.listen(PORT, async () => {
    console.log(`[api] Ag-grid API v${API_VERSION} → http://localhost:${PORT}`)
    console.log(
      '[api] Routes: GET/POST /api/seed, GET /api/health, GET /api/tables, POST /api/tables/:id/rows',
    )
    try {
      const result = await checkSupabaseConnection()
      console.log(
        result.ok ? '[api] Supabase connection OK' : `[api] Supabase: ${result.error ?? 'failed'}`,
      )
      if (result.ok) {
        await ensureDatabaseSeeded()
      }
    } catch (e) {
      console.error('[api] Supabase:', e instanceof Error ? e.message : e)
    }
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[api] Port ${PORT} is already in use (often an OLD API without /api/seed).`,
      )
      console.error('[api] Run: npm run free-port   then: npm run dev')
      process.exit(1)
    }
    throw err
  })
}

startServer()
