import 'dotenv/config'
import { dynamicTableDatasets } from '../src/data/dynamicTableDatasets.ts'
import { getTableFields, queryServerSideRows } from '../server/queryRows.ts'

const base = { startRow: 0, endRow: 10, sortModel: [] }
let failed = 0

for (const dataset of dynamicTableDatasets) {
  try {
    const fields = await getTableFields(dataset.id)
    const result = await queryServerSideRows(dataset.id, fields, base)
    const first = result.rowData[0]
    const ok =
      result.rowData.length > 0 &&
      first?.rowId != null &&
      first?.__rowIndex != null &&
      result.rowCount >= 1000

    if (!ok) {
      failed += 1
      console.error(`FAIL ${dataset.id}`, result.rowData.length, result.rowCount, first)
    } else {
      console.log(`OK ${dataset.id} | rows ${result.rowData.length} | total ${result.rowCount} | id ${first.rowId}`)
    }
  } catch (e) {
    failed += 1
    console.error(`FAIL ${dataset.id}`, e instanceof Error ? e.message : e)
  }
}

try {
  const tableId = dynamicTableDatasets[0].id
  const fields = await getTableFields(tableId)
  const page = await queryServerSideRows(tableId, fields, {
    startRow: 100,
    endRow: 110,
    sortModel: [],
  })
  if (page.rowData.length !== 10 || page.startRow !== 100 || page.rowData[0]?.__rowIndex !== 100) {
    failed += 1
    console.error('FAIL pagination', page)
  } else {
    console.log('OK pagination | rows 10 | start 100')
  }

  const searched = await queryServerSideRows(tableId, fields, {
    startRow: 0,
    endRow: 10,
    sortModel: [],
    quickFilter: 'Desk',
  })
  if (!searched.rowData.length || !String(searched.rowData[0]?.name ?? '').includes('Desk')) {
    failed += 1
    console.error('FAIL quick search', searched)
  } else {
    console.log(`OK quick search | ${searched.rowCount} matching rows`)
  }

  const filtered = await queryServerSideRows(tableId, fields, {
    startRow: 0,
    endRow: 10,
    sortModel: [],
    filterModel: {
      region: { filterType: 'text', type: 'equals', filter: 'North' },
    },
  })
  if (!filtered.rowData.length || filtered.rowData.some((row) => row.region !== 'North')) {
    failed += 1
    console.error('FAIL column filter', filtered)
  } else {
    console.log(`OK column filter | ${filtered.rowCount} North rows`)
  }

  const grouped = await queryServerSideRows(tableId, fields, {
    startRow: 0,
    endRow: 10,
    sortModel: [],
    rowGroupCols: [{ field: 'region', id: 'region' }],
    valueCols: [{ field: 'price', id: 'price', aggFunc: 'avg' }],
    groupKeys: [],
  })
  if (
    !grouped.rowData.length ||
    grouped.rowData.some((row) => row.__group !== true || row.__groupKey == null)
  ) {
    failed += 1
    console.error('FAIL row grouping', grouped)
  } else {
    console.log(`OK row grouping | ${grouped.rowCount} region groups`)
  }

  const groupedChildren = await queryServerSideRows(tableId, fields, {
    startRow: 0,
    endRow: 10,
    sortModel: [],
    rowGroupCols: [{ field: 'region', id: 'region' }],
    groupKeys: ['North'],
  })
  if (!groupedChildren.rowData.length || groupedChildren.rowData.some((row) => row.region !== 'North')) {
    failed += 1
    console.error('FAIL group children', groupedChildren)
  } else {
    console.log(`OK group children | ${groupedChildren.rowCount} North rows`)
  }
} catch (e) {
  failed += 1
  console.error('FAIL request features', e instanceof Error ? e.message : e)
}

if (failed > 0) {
  console.error(`\n${failed} table(s) failed`)
  process.exit(1)
}
console.log('\nAll tables OK')
