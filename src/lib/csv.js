import * as XLSX from 'xlsx'
import { loadCareers, saveCareers } from './storage.js'
import { phase1StorageKey } from './phase1.js'

const DEFAULT_SETUP = { rent: 1650, deposit: 1650, license: 100, groceries: 250, home: 350, phone: 60, internet: 75, transit: 72 }
const SUPPORTED_FORMATS = ['csv', 'xls', 'xlsx']

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csvRow(values) {
  return values.map(csvCell).join(',')
}

function instructionsRow() {
  return ['INSTRUCTIONS', 'CSV: use ponto para casas decimais e não use separador de milhar. Ex.: 1602.63. XLS/XLSX: use células numéricas normais do Excel.']
}

function templateRows() {
  return [
    ['ATS_CAREER_BACKUP', '7'],
    instructionsRow(),
    ['CAREER','id','driverName','city','company','arrivalBalance','initialBalance','bio','createdAt'],
    ['CAREER','','Seu Nome','Los Angeles, CA','Nome da Empresa',5000,793,'Biografia do personagem',''],
    ['SETUP_COST','name','value'],
    ...Object.entries(DEFAULT_SETUP).map(([name, value]) => ['SETUP_COST', name, value]),
    ['STATE','balance','careerLevel','currentWeek','academyLevel2','academyLevel3','hazmatQualified','emergencyReserve'],
    ['STATE',793,1,1,0,0,0,0],
    ['TRIP','id','week','departureAt','arrivalAt','origin','originCompany','destination','destinationCompany','cargo','type','payCategory','miles'],
    ['TRIP','',1,'2026-08-19T07:00','2026-08-19T10:00','Los Angeles, CA','Filial Los Angeles','Bakersfield, CA','Filial Bakersfield','Alimentos','Loaded','normal',115],
    ['HISTORY','date','type','desc','value','balance'],
    ['EXPENSE','id','name','value','monthly'],
    ['INCIDENT','id','type','date','time','route','description','amount','chargeMethod','status','remaining','createdAt'],
    ['CLOSED_WEEK','week','closedAt','miles','level','gross','taxes','benefits','netSalary','perDiem','incidentDeduction','reserveInterest','deposit','desc'],
  ]
}

export function parseCSV(text) {
  const rows = []
  let row = [], field = '', quoted = false
  const source = String(text || '').replace(/^\ufeff/, '')
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { field += '"'; i += 1 }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += ch
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  return rows.filter((item) => item.some((value) => String(value).length))
}

function downloadCsv(name, rows) {
  const blob = new Blob([`\ufeff${rows.map(csvRow).join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function writeWorkbook(rows, filename) {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  worksheet['!cols'] = Array.from({ length: 14 }, (_, index) => ({ wch: index === 7 ? 42 : index < 2 ? 18 : 22 }))
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Carreira ATS')
  // SheetJS infere BIFF8 para .xls e XLSX para .xlsx pelo nome do arquivo.
  XLSX.writeFile(workbook, filename)
}

export function downloadCSVTemplate() {
  downloadCsv('modelo_carreira_ats.csv', templateRows())
}

export function downloadExcelTemplate(format = 'xlsx') {
  if (!['xls', 'xlsx'].includes(format)) throw new Error('Formato de planilha não suportado.')
  writeWorkbook(templateRows(), `modelo_carreira_ats.${format}`)
}

function careerRows(career, state) {
  if (!career) throw new Error('Carreira não encontrada para exportação.')
  const safeState = state || {}
  return [
    ['ATS_CAREER_BACKUP', '7'],
    instructionsRow(),
    ['CAREER','id','driverName','city','company','arrivalBalance','initialBalance','bio','createdAt'],
    ['CAREER',career.id,career.driverName,career.city,career.company,career.arrivalBalance,career.initialBalance,career.bio || career.biography || '',career.createdAt || ''],
    ['SETUP_COST','name','value'],
    ...Object.entries({ ...DEFAULT_SETUP, ...(career.setupCosts || {}) }).map(([name, value]) => ['SETUP_COST', name, value]),
    ['STATE','balance','careerLevel','currentWeek','academyLevel2','academyLevel3','hazmatQualified','emergencyReserve'],
    ['STATE',safeState.balance ?? career.currentBalance ?? career.initialBalance ?? 0,safeState.currentLevel || safeState.careerLevel || career.currentLevel || 1,safeState.currentWeek || 1,safeState.academy?.level2 ? 1 : 0,safeState.academy?.level3 ? 1 : 0,safeState.hazmatQualified ? 1 : 0,safeState.emergencyReserve || 0],
    ['TRIP','id','week','departureAt','arrivalAt','origin','originCompany','destination','destinationCompany','cargo','type','payCategory','miles'],
    ...(safeState.trips || []).map((trip) => ['TRIP',trip.id,trip.week,trip.departureAt,trip.arrivalAt,trip.origin,trip.originCompany,trip.destination,trip.destinationCompany,trip.cargo,trip.type,trip.payCategory,trip.miles]),
    ['HISTORY','date','type','desc','value','balance'],
    ...(safeState.history || []).map((item) => ['HISTORY',item.date,item.type,item.desc,item.value ?? item.amount ?? 0,item.balance]),
    ['EXPENSE','id','name','value','monthly'],
    ...(safeState.customExpenses || []).map((item) => ['EXPENSE',item.id,item.name,item.value,item.monthly ? 1 : 0]),
    ['INCIDENT','id','type','date','time','route','description','amount','chargeMethod','status','remaining','createdAt'],
    ...(safeState.incidents || []).map((item) => ['INCIDENT',item.id,item.type,item.date,item.time,item.route,item.description,item.amount,item.chargeMethod,item.status,item.remaining,item.createdAt]),
    ['CLOSED_WEEK','week','closedAt','miles','level','gross','taxes','benefits','netSalary','perDiem','incidentDeduction','reserveInterest','deposit','desc'],
    ...(safeState.closedWeeks || []).map((week) => ['CLOSED_WEEK',week.week,week.closedAt,week.miles,week.level,week.gross,week.taxes,week.benefits,week.netSalary,week.perDiem,week.incidentDeduction,week.reserveInterest || 0,week.deposit,week.desc]),
  ]
}

function safeFileStem(career) {
  return String(career?.driverName || 'carreira').trim().replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'carreira'
}

export function exportCareerCSV(career, state) {
  downloadCsv(`ats_${safeFileStem(career)}.csv`, careerRows(career, state))
}

export function exportCareerExcel(career, state, format = 'xlsx') {
  if (!['xls', 'xlsx'].includes(format)) throw new Error('Formato de planilha não suportado.')
  writeWorkbook(careerRows(career, state), `ats_${safeFileStem(career)}.${format}`)
}

function hasValue(value) {
  return String(value ?? '').trim().length > 0
}

function boolValue(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'sim'
}

function parseStrictNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  const text = String(value ?? '').trim()
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(text)) return NaN
  const number = Number(text)
  return Number.isFinite(number) ? number : NaN
}

function labelAt(type, field, lineIndex) {
  return `${type}.${field} (linha ${lineIndex + 1})`
}

function validateNumeric(value, label, invalid, options = {}) {
  if (!hasValue(value)) return
  const number = parseStrictNumber(value)
  if (!Number.isFinite(number)) {
    invalid.push(`${label} (use apenas números; no CSV, ponto para decimais)`)
    return
  }
  if (options.integer && !Number.isInteger(number)) invalid.push(`${label} (deve ser inteiro)`)
  if (options.min != null && number < options.min) invalid.push(`${label} (mínimo ${options.min})`)
  if (options.max != null && number > options.max) invalid.push(`${label} (máximo ${options.max})`)
}

function validateImportRows(rows, version) {
  const missing = []
  const invalid = []
  const careerIndex = rows.findIndex((row) => String(row[0] || '').trim() === 'CAREER' && row[1] !== 'id')
  const stateIndex = rows.findIndex((row) => String(row[0] || '').trim() === 'STATE' && row[1] !== 'balance')

  if (careerIndex < 0) missing.push('linha CAREER')
  else {
    const row = rows[careerIndex]
    ;[[2,'driverName'],[3,'city'],[4,'company'],[5,'arrivalBalance'],[6,'initialBalance']].forEach(([column, field]) => {
      if (!hasValue(row[column])) missing.push(labelAt('CAREER', field, careerIndex))
    })
    validateNumeric(row[5], labelAt('CAREER','arrivalBalance',careerIndex), invalid)
    validateNumeric(row[6], labelAt('CAREER','initialBalance',careerIndex), invalid)
  }

  if (stateIndex < 0) missing.push('linha STATE')
  else {
    const row = rows[stateIndex]
    const required = [[1,'balance'],[2,'careerLevel'],[3,'currentWeek']]
    if (version >= 7) required.push([7,'emergencyReserve'])
    required.forEach(([column, field]) => { if (!hasValue(row[column])) missing.push(labelAt('STATE', field, stateIndex)) })
    validateNumeric(row[1], labelAt('STATE','balance',stateIndex), invalid)
    validateNumeric(row[2], labelAt('STATE','careerLevel',stateIndex), invalid, { integer: true, min: 1, max: 3 })
    validateNumeric(row[3], labelAt('STATE','currentWeek',stateIndex), invalid, { integer: true, min: 1 })
    if (version >= 7) validateNumeric(row[7], labelAt('STATE','emergencyReserve',stateIndex), invalid, { min: 0 })
  }

  rows.forEach((row, index) => {
    const type = String(row[0] || '').trim()
    if (!type || ['ATS_CAREER_BACKUP','INSTRUCTIONS','CAREER','STATE'].includes(type)) return

    if (type === 'SETUP_COST' && row[1] !== 'name') {
      if (!hasValue(row[1])) missing.push(labelAt(type,'name',index))
      if (!hasValue(row[2])) missing.push(labelAt(type,'value',index))
      validateNumeric(row[2], labelAt(type,'value',index), invalid, { min: 0 })
      return
    }

    if (type === 'TRIP' && row[1] !== 'id') {
      validateNumeric(row[1], labelAt(type,'id',index), invalid, { integer: true, min: 1 })
      validateNumeric(row[2], labelAt(type,'week',index), invalid, { integer: true, min: 1 })
      const milesIndex = row.length >= 13 ? 12 : row.length - 1
      if (!hasValue(row[milesIndex])) missing.push(labelAt(type,'miles',index))
      validateNumeric(row[milesIndex], labelAt(type,'miles',index), invalid, { min: 0.01 })
      return
    }

    if (type === 'HISTORY' && row[1] !== 'date') {
      validateNumeric(row[4], labelAt(type,'value',index), invalid)
      validateNumeric(row[5], labelAt(type,'balance',index), invalid)
      return
    }

    if (type === 'EXPENSE' && row[1] !== 'id') {
      validateNumeric(row[1], labelAt(type,'id',index), invalid, { integer: true, min: 1 })
      if (!hasValue(row[3])) missing.push(labelAt(type,'value',index))
      validateNumeric(row[3], labelAt(type,'value',index), invalid, { min: 0 })
      return
    }

    if (type === 'INCIDENT' && row[1] !== 'id') {
      validateNumeric(row[1], labelAt(type,'id',index), invalid, { integer: true, min: 1 })
      if (!hasValue(row[7])) missing.push(labelAt(type,'amount',index))
      validateNumeric(row[7], labelAt(type,'amount',index), invalid, { min: 0 })
      validateNumeric(row[10], labelAt(type,'remaining',index), invalid, { min: 0 })
      return
    }

    if (type === 'CLOSED_WEEK' && row[1] !== 'week') {
      validateNumeric(row[1], labelAt(type,'week',index), invalid, { integer: true, min: 1 })
      validateNumeric(row[3], labelAt(type,'miles',index), invalid, { min: 0 })
      validateNumeric(row[4], labelAt(type,'level',index), invalid, { integer: true, min: 1, max: 3 })
      const fields = version >= 7
        ? [[5,'gross'],[6,'taxes'],[7,'benefits'],[8,'netSalary'],[9,'perDiem'],[10,'incidentDeduction'],[11,'reserveInterest'],[12,'deposit']]
        : [[5,'gross'],[6,'taxes'],[7,'benefits'],[8,'netSalary'],[9,'perDiem'],[10,'incidentDeduction'],[11,'deposit']]
      fields.forEach(([column, field]) => validateNumeric(row[column], labelAt(type,field,index), invalid))
    }
  })

  if (missing.length) throw new Error(`Arquivo incompleto. Campos obrigatórios ausentes: ${[...new Set(missing)].join(', ')}.`)
  if (invalid.length) throw new Error(`Arquivo inválido. Revise estes campos: ${[...new Set(invalid)].join(', ')}.`)
}

function importCareerRows(rows) {
  if (!rows.length || String(rows[0][0] || '').trim() !== 'ATS_CAREER_BACKUP') throw new Error('O arquivo não possui a identificação ATS_CAREER_BACKUP.')
  const version = parseStrictNumber(rows[0][1] ?? 1)
  if (!Number.isInteger(version) || version < 1) throw new Error('A versão do backup é inválida.')
  validateImportRows(rows, version)

  const imported = {
    career: null,
    setupCosts: {},
    state: { balance: 0, emergencyReserve: 0, history: [], careerMiles: 0, careerLevel: 1, currentLevel: 1, trips: [], customExpenses: [], currentWeek: 1, closedWeeks: [], incidents: [], academy: { level2: false, level3: false }, hazmatQualified: false },
  }

  for (const row of rows.slice(1)) {
    const type = String(row[0] || '').trim()
    if (type === 'CAREER' && row[1] !== 'id') {
      imported.career = { driverName: row[2] || '', city: row[3] || '', company: row[4] || '', arrivalBalance: parseStrictNumber(row[5]), initialBalance: parseStrictNumber(row[6]), bio: row[7] || '', createdAt: version <= 1 ? new Date().toISOString() : (row[8] || new Date().toISOString()) }
    } else if (type === 'SETUP_COST' && row[1] && row[1] !== 'name') {
      imported.setupCosts[row[1]] = parseStrictNumber(row[2])
    } else if (type === 'STATE' && row[1] !== 'balance') {
      const level = parseStrictNumber(row[2])
      imported.state.balance = parseStrictNumber(row[1])
      imported.state.careerLevel = level
      imported.state.currentLevel = level
      imported.state.currentWeek = parseStrictNumber(row[3])
      imported.state.academy = { level2: boolValue(row[4]) || level >= 2, level3: boolValue(row[5]) || level >= 3 }
      imported.state.hazmatQualified = boolValue(row[6])
      imported.state.emergencyReserve = version >= 7 ? parseStrictNumber(row[7]) : 0
    } else if (type === 'TRIP' && row[1] !== 'id') {
      const modern = row.length >= 13
      const generatedId = Date.now() + Math.floor(Math.random() * 10000)
      imported.state.trips.push(modern ? {
        id: hasValue(row[1]) ? parseStrictNumber(row[1]) : generatedId,
        week: parseStrictNumber(row[2]) || 1,
        departureAt: row[3] || '', arrivalAt: row[4] || '', date: String(row[3] || '').slice(0, 10),
        origin: row[5] || '', originCompany: row[6] || '—', destination: row[7] || '', destinationCompany: row[8] || '—', cargo: row[9] || '',
        type: row[10] || 'Loaded', payCategory: row[11] || (String(row[10]).toLowerCase() === 'deadhead' ? 'deadhead' : 'normal'), miles: parseStrictNumber(row[12]),
      } : {
        id: hasValue(row[1]) ? parseStrictNumber(row[1]) : generatedId,
        week: parseStrictNumber(row[2]) || 1,
        date: row[3] || '', departureAt: row[3] || '', arrivalAt: '', origin: row[4] || '', originCompany: row[5] || '—', destination: row[6] || '', destinationCompany: row[7] || '—', cargo: row[8] || '',
        type: row[9] || 'Loaded', payCategory: row[10] && Number.isNaN(parseStrictNumber(row[10])) ? row[10] : (String(row[9]).toLowerCase() === 'deadhead' ? 'deadhead' : 'normal'), miles: parseStrictNumber(row[row.length - 1]),
      })
    } else if (type === 'HISTORY' && row[1] !== 'date') {
      const value = hasValue(row[4]) ? parseStrictNumber(row[4]) : 0
      imported.state.history.push({ date: row[1] || '', type: row[2] || '', desc: row[3] || '', value, amount: value, balance: hasValue(row[5]) ? parseStrictNumber(row[5]) : 0 })
    } else if (type === 'EXPENSE' && row[1] !== 'id') {
      imported.state.customExpenses.push({ id: hasValue(row[1]) ? parseStrictNumber(row[1]) : Date.now() + Math.floor(Math.random() * 10000), name: row[2] || '', value: parseStrictNumber(row[3]), monthly: boolValue(row[4]) })
    } else if (type === 'INCIDENT' && row[1] !== 'id') {
      imported.state.incidents.push({ id: hasValue(row[1]) ? parseStrictNumber(row[1]) : Date.now() + Math.floor(Math.random() * 10000), type: row[2] || 'Infração', date: row[3] || '', time: row[4] || '', route: row[5] || '', description: row[6] || '', amount: parseStrictNumber(row[7]), chargeMethod: row[8] || 'balance', status: row[9] || '', remaining: hasValue(row[10]) ? parseStrictNumber(row[10]) : 0, createdAt: row[11] || '' })
    } else if (type === 'CLOSED_WEEK' && row[1] !== 'week') {
      const n = (column, fallback = 0) => hasValue(row[column]) ? parseStrictNumber(row[column]) : fallback
      if (version >= 7) imported.state.closedWeeks.push({ week: n(1,1), closedAt: row[2] || '', miles: n(3), level: n(4,1), gross: n(5), taxes: n(6), benefits: n(7), netSalary: n(8), perDiem: n(9), incidentDeduction: n(10), reserveInterest: n(11), deposit: n(12), desc: row[13] || '' })
      else imported.state.closedWeeks.push({ week: n(1,1), closedAt: row[2] || '', miles: n(3), level: n(4,1), gross: n(5), taxes: n(6), benefits: n(7), netSalary: n(8), perDiem: n(9), incidentDeduction: row.length >= 13 ? n(10) : 0, reserveInterest: 0, deposit: n(row.length >= 13 ? 11 : 10), desc: row[row.length >= 13 ? 12 : 11] || '' })
    }
  }

  const setup = Object.keys(imported.setupCosts).length ? { ...DEFAULT_SETUP, ...imported.setupCosts } : { ...DEFAULT_SETUP }
  const setupTotal = Object.values(setup).reduce((sum, value) => sum + Number(value || 0), 0)
  const newId = `career_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const career = {
    id: newId,
    driverName: String(imported.career.driverName).trim(), city: String(imported.career.city).trim(), company: String(imported.career.company).trim(),
    arrivalBalance: imported.career.arrivalBalance, setupCosts: setup, setupCostsTotal: setupTotal, initialBalance: imported.career.initialBalance,
    currentBalance: imported.state.balance, currentLevel: imported.state.currentLevel || 1, bio: imported.career.bio || '',
    createdAt: imported.career.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  imported.state.careerMiles = imported.state.trips.reduce((sum, trip) => sum + Number(trip.miles || 0), 0)
  const careers = loadCareers()
  careers.push(career)
  saveCareers(careers)
  localStorage.setItem(phase1StorageKey(newId), JSON.stringify(imported.state))
  localStorage.setItem('ats_active_career', newId)
  return { career, state: imported.state, version }
}

export function importCareerCSVText(text) {
  return importCareerRows(parseCSV(text))
}

export function importCareerWorkbookData(data) {
  const workbook = XLSX.read(data, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('A planilha não possui nenhuma aba para importar.')
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: '' })
  return importCareerRows(rows.filter((row) => row.some((value) => hasValue(value))))
}

export async function importCareerFile(file) {
  if (!file) throw new Error('Nenhum arquivo foi selecionado.')
  const extension = String(file.name || '').split('.').pop().toLowerCase()
  if (!SUPPORTED_FORMATS.includes(extension)) throw new Error('Formato não suportado. Use CSV, XLS ou XLSX.')
  if (extension === 'csv') return importCareerCSVText(await file.text())
  return importCareerWorkbookData(await file.arrayBuffer())
}
