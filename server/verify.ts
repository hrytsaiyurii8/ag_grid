import { MIN_ROWS_PER_TABLE } from '../shared/constants.js'
import { verifyAllTablesMeetMinimum } from './seed.js'

verifyAllTablesMeetMinimum()
  .then(({ ok, tables }) => {
    tables.forEach((t) => {
      const status = t.rowCount >= MIN_ROWS_PER_TABLE ? 'ok' : 'FAIL'
      console.log(`[verify] ${t.id}: ${t.rowCount} rows — ${status}`)
    })
    if (!ok) {
      console.error(`\n[verify] At least ${MIN_ROWS_PER_TABLE} rows per table required. Run: npm run seed`)
      process.exit(1)
    }
    console.log(`\n[verify] All tables meet the ${MIN_ROWS_PER_TABLE}+ row requirement.`)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
