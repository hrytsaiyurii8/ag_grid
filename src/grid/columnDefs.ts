import type { ColDef, ColGroupDef, ValueFormatterParams } from 'ag-grid-community'
import type { Row } from '../types'

const formatCurrency = (p: ValueFormatterParams) =>
  typeof p.value === 'number'
    ? p.value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
    : ''

export function makeColumnDefs(colCount: number): Array<ColDef<Row> | ColGroupDef<Row>> {
  const base: Array<ColDef<Row> | ColGroupDef<Row>> = [
    {
      headerName: 'Participant',
      marryChildren: true,
      children: [
        {
          field: 'name',
          headerName: 'Name',
          minWidth: 180,
          enableRowGroup: true,
          enablePivot: true,
          rowDrag: true,
        },
        {
          field: 'language',
          headerName: 'Language',
          minWidth: 120,
          enableRowGroup: true,
          enablePivot: true,
        },
        {
          field: 'country',
          headerName: 'Country',
          minWidth: 150,
          enableRowGroup: true,
          enablePivot: true,
          cellRenderer: 'countryCellRenderer',
        },
      ],
    },
    {
      headerName: 'Game of Choice',
      marryChildren: true,
      children: [
        {
          field: 'game',
          headerName: 'Game Name',
          minWidth: 180,
          enableRowGroup: true,
          enablePivot: true,
        },
        {
          field: 'bought',
          headerName: 'Bought',
          minWidth: 100,
          cellDataType: 'boolean',
        },
      ],
    },
    {
      headerName: 'Performance',
      marryChildren: true,
      children: [
        {
          field: 'bankBalance',
          headerName: 'Bank Balance',
          minWidth: 140,
          valueFormatter: formatCurrency,
          aggFunc: 'avg',
          enableValue: true,
        },
        {
          field: 'rating',
          headerName: 'Rating',
          minWidth: 120,
          aggFunc: 'avg',
          enableValue: true,
          enableRowGroup: true,
          enablePivot: true,
          cellRenderer: 'starRatingRenderer',
        },
      ],
    },
    {
      field: 'totalWinnings',
      headerName: 'Total Winnings',
      minWidth: 150,
      valueFormatter: formatCurrency,
      aggFunc: 'sum',
      enableValue: true,
    },
    {
      headerName: 'Monthly Breakdown',
      marryChildren: true,
      children: [
        { field: 'jan', headerName: 'Jan', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'feb', headerName: 'Feb', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'mar', headerName: 'Mar', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'apr', headerName: 'Apr', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'may', headerName: 'May', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'jun', headerName: 'Jun', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'jul', headerName: 'Jul', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'aug', headerName: 'Aug', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'sep', headerName: 'Sep', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'oct', headerName: 'Oct', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'nov', headerName: 'Nov', minWidth: 100, aggFunc: 'sum', enableValue: true },
        { field: 'dec', headerName: 'Dec', minWidth: 100, aggFunc: 'sum', enableValue: true },
      ],
    },
  ]

  const syntheticCount = Math.max(0, colCount - 22)
  for (let i = 0; i < syntheticCount; i++) {
    base.push({
      headerName: `Extra ${i + 1}`,
      field: 'performance',
      valueGetter: (p) =>
        typeof p.data?.performance === 'number' ? p.data.performance * (i + 1) : null,
      minWidth: 120,
      aggFunc: 'avg',
      enableValue: true,
    })
  }
  return base
}
