/**
 * Free a TCP port before starting the API (Windows dev often keeps an old Express on 3001).
 * Usage: node scripts/free-port.mjs 3001
 */
import { execSync } from 'node:child_process'

const port = Number(process.argv[2] ?? 3001)
if (!Number.isFinite(port)) {
  console.error('Usage: node scripts/free-port.mjs <port>')
  process.exit(1)
}

const isWin = process.platform === 'win32'

try {
  if (isWin) {
    const out = execSync(
      `netstat -ano | findstr ":${port}" | findstr LISTENING`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
    )
    const pids = new Set(
      out
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && /^\d+$/.test(pid) && pid !== '0'),
    )
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        console.log(`[free-port] Stopped PID ${pid} on port ${port}`)
      } catch {
        // process already gone
      }
    }
  } else {
    execSync(`lsof -ti:${port} | xargs -r kill -9`, { stdio: 'ignore', shell: true })
    console.log(`[free-port] Cleared port ${port}`)
  }
} catch {
  // nothing listening
}
