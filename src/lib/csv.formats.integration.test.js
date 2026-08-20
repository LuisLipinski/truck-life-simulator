// @vitest-environment jsdom

import * as XLSX from 'xlsx'
import { beforeEach, describe, expect, it } from 'vitest'
import { importCareerCSVText, importCareerWorkbookData } from './csv.js'
import { CAREERS_KEY } from './storage.js'

function validRows() {
  return [
    ['ATS_CAREER_BACKUP', 7],
    ['CAREER','id','driverName','city','company','arrivalBalance','initialBalance','bio','createdAt'],
    ['CAREER','','Excel Driver','Los Angeles, CA','Pacific Horizon Logistics',5000,793,'',''],
    ['STATE','balance','careerLevel','currentWeek','academyLevel2','academyLevel3','hazmatQualified','emergencyReserve'],
    ['STATE',793,1,1,0,0,0,1602.63],
    ['TRIP','id','week','departureAt','arrivalAt','origin','originCompany','destination','destinationCompany','cargo','type','payCategory','miles'],
    ['TRIP','',1,'2026-08-20T07:00','2026-08-20T10:00','Los Angeles, CA','Filial LA','Bakersfield, CA','Cliente','Alimentos','Loaded','normal',115.5],
    ['EXPENSE','id','name','value','monthly'],
    ['EXPENSE',1,'Lavanderia',25.5,1],
    ['INCIDENT','id','type','date','time','route','description','amount','chargeMethod','status','remaining','createdAt'],
    ['INCIDENT',1,'Infração','2026-08-20','10:00','I-5','Teste',75.25,'payslip','Pendente',75.25,''],
  ]
}

function rowsToWorkbookBuffer(rows, format = 'xlsx') {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Carreira ATS')
  return XLSX.write(workbook, { type: 'array', bookType: format === 'xls' ? 'biff8' : 'xlsx' })
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

describe('backup numeric validation and Excel formats', () => {
  beforeEach(() => localStorage.clear())

  it('rejects letters in secondary numeric fields instead of silently converting to zero', () => {
    const rows = validRows()
    rows[6][12] = 'cento e quinze'
    rows[8][3] = 'vinte'
    rows[10][7] = 'multa'

    expect(() => importCareerCSVText(rowsToCsv(rows))).toThrow(/TRIP\.miles.*EXPENSE\.value.*INCIDENT\.amount/s)
    expect(JSON.parse(localStorage.getItem(CAREERS_KEY) || '[]')).toEqual([])
  })

  it('rejects comma decimals in CSV and explains that CSV requires a decimal point', () => {
    const rows = validRows()
    rows[4][7] = '1602,63'

    expect(() => importCareerCSVText(rowsToCsv(rows))).toThrow(/ponto para decimais/)
    expect(JSON.parse(localStorage.getItem(CAREERS_KEY) || '[]')).toEqual([])
  })

  it('imports XLSX numeric cells including decimal values', () => {
    const result = importCareerWorkbookData(rowsToWorkbookBuffer(validRows(), 'xlsx'))

    expect(result.career.driverName).toBe('Excel Driver')
    expect(result.state.emergencyReserve).toBeCloseTo(1602.63)
    expect(result.state.trips[0].miles).toBeCloseTo(115.5)
    expect(result.state.customExpenses[0].value).toBeCloseTo(25.5)
  })

  it('imports legacy XLS numeric cells too', () => {
    const result = importCareerWorkbookData(rowsToWorkbookBuffer(validRows(), 'xls'))

    expect(result.career.driverName).toBe('Excel Driver')
    expect(result.state.emergencyReserve).toBeCloseTo(1602.63)
    expect(result.state.incidents[0].amount).toBeCloseTo(75.25)
  })
})
