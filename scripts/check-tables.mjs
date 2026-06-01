import 'dotenv/config'
import { fetchTableList } from '../server/queryRows.ts'

const tables = await fetchTableList()
for (const t of tables) {
  console.log(`${t.id}: ${t.rowCount}`)
}
