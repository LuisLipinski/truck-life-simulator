import { loadCareers, saveCareers } from './storage.js'
import { phase1StorageKey } from './phase1.js'

const DEFAULT_SETUP = { rent: 1650, deposit: 1650, license: 100, groceries: 250, home: 350, phone: 60, internet: 75, transit: 72 }

function csvRow(values) {
  return values.map((value) => {
    const text = String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }).join(',')
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
  const blob = new Blob([`\ufeff${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function downloadCSVTemplate() {
  const rows = [
    csvRow(['ATS_CAREER_BACKUP', '7']),
    csvRow(['CAREER','id','driverName','city','company','arrivalBalance','initialBalance','bio','createdAt']),
    csvRow(['CAREER','','Seu Nome','Los Angeles, CA','Nome da Empresa',5000,793,'Biografia do personagem','']),
    csvRow(['SETUP_COST','name','value']),
    ...Object.entries(DEFAULT_SETUP).map(([name, value]) => csvRow(['SETUP_COST', name, value])),
    csvRow(['STATE','balance','careerLevel','currentWeek','academyLevel2','academyLevel3','hazmatQualified','emergencyReserve']),
    csvRow(['STATE',793,1,1,0,0,0,0]),
    csvRow(['TRIP','id','week','departureAt','arrivalAt','origin','originCompany','destination','destinationCompany','cargo','type','payCategory','miles']),
    csvRow(['TRIP','',1,'2026-08-19T07:00','2026-08-19T10:00','Los Angeles, CA','Filial Los Angeles','Bakersfield, CA','Filial Bakersfield','Alimentos','Loaded','normal',115]),
    csvRow(['HISTORY','date','type','desc','value','balance']),
    csvRow(['EXPENSE','id','name','value','monthly']),
    csvRow(['INCIDENT','id','type','date','time','route','description','amount','chargeMethod','status','remaining','createdAt']),
    csvRow(['CLOSED_WEEK','week','closedAt','miles','level','gross','taxes','benefits','netSalary','perDiem','incidentDeduction','reserveInterest','deposit','desc']),
  ]
  downloadCsv('modelo_carreira_ats.csv', rows)
}

export function exportCareerCSV(career, state) {
  if (!career) throw new Error('Carreira não encontrada para exportação.')
  const safeState = state || {}
  const rows = [
    csvRow(['ATS_CAREER_BACKUP', '7']),
    csvRow(['CAREER','id','driverName','city','company','arrivalBalance','initialBalance','bio','createdAt']),
    csvRow(['CAREER',career.id,career.driverName,career.city,career.company,career.arrivalBalance,career.initialBalance,career.bio || career.biography || '',career.createdAt || '']),
    csvRow(['SETUP_COST','name','value']),
    ...Object.entries({ ...DEFAULT_SETUP, ...(career.setupCosts || {}) }).map(([name, value]) => csvRow(['SETUP_COST', name, value])),
    csvRow(['STATE','balance','careerLevel','currentWeek','academyLevel2','academyLevel3','hazmatQualified','emergencyReserve']),
    csvRow(['STATE',safeState.balance ?? career.currentBalance ?? career.initialBalance ?? 0,safeState.currentLevel || safeState.careerLevel || career.currentLevel || 1,safeState.currentWeek || 1,safeState.academy?.level2 ? 1 : 0,safeState.academy?.level3 ? 1 : 0,safeState.hazmatQualified ? 1 : 0,safeState.emergencyReserve || 0]),
    csvRow(['TRIP','id','week','departureAt','arrivalAt','origin','originCompany','destination','destinationCompany','cargo','type','payCategory','miles']),
    ...(safeState.trips || []).map((trip) => csvRow(['TRIP',trip.id,trip.week,trip.departureAt,trip.arrivalAt,trip.origin,trip.originCompany,trip.destination,trip.destinationCompany,trip.cargo,trip.type,trip.payCategory,trip.miles])),
    csvRow(['HISTORY','date','type','desc','value','balance']),
    ...(safeState.history || []).map((item) => csvRow(['HISTORY',item.date,item.type,item.desc,item.value ?? item.amount ?? 0,item.balance])),
    csvRow(['EXPENSE','id','name','value','monthly']),
    ...(safeState.customExpenses || []).map((item) => csvRow(['EXPENSE',item.id,item.name,item.value,item.monthly ? 1 : 0])),
    csvRow(['INCIDENT','id','type','date','time','route','description','amount','chargeMethod','status','remaining','createdAt']),
    ...(safeState.incidents || []).map((item) => csvRow(['INCIDENT',item.id,item.type,item.date,item.time,item.route,item.description,item.amount,item.chargeMethod,item.status,item.remaining,item.createdAt])),
    csvRow(['CLOSED_WEEK','week','closedAt','miles','level','gross','taxes','benefits','netSalary','perDiem','incidentDeduction','reserveInterest','deposit','desc']),
    ...(safeState.closedWeeks || []).map((week) => csvRow(['CLOSED_WEEK',week.week,week.closedAt,week.miles,week.level,week.gross,week.taxes,week.benefits,week.netSalary,week.perDiem,week.incidentDeduction,week.reserveInterest || 0,week.deposit,week.desc])),
  ]
  const fileName = `ats_${String(career.driverName || 'carreira').trim().replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'carreira'}.csv`
  downloadCsv(fileName, rows)
}

function boolValue(value) {
  const normalized = String(value ?? '').toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

export function importCareerCSVText(text) {
  const rows = parseCSV(text)
  if (!rows.length || rows[0][0] !== 'ATS_CAREER_BACKUP') throw new Error('O arquivo não possui a identificação ATS_CAREER_BACKUP.')
  const version = Number(rows[0][1] || 1)
  const imported = {
    career: null,
    setupCosts: {},
    state: { balance: 0, emergencyReserve: 0, history: [], careerMiles: 0, careerLevel: 1, currentLevel: 1, trips: [], customExpenses: [], currentWeek: 1, closedWeeks: [], incidents: [], academy: { level2: false, level3: false }, hazmatQualified: false },
  }

  for (const row of rows.slice(1)) {
    const type = String(row[0] || '').trim()
    if (type === 'CAREER' && row[1] !== 'id') {
      imported.career = { driverName: row[2] || '', city: row[3] || '', company: row[4] || '', arrivalBalance: Number(row[5]) || 0, initialBalance: Number(row[6]) || 0, bio: row[7] || '', createdAt: version <= 1 ? new Date().toISOString() : (row[8] || new Date().toISOString()) }
    } else if (type === 'SETUP_COST' && row[1] && row[1] !== 'name') imported.setupCosts[row[1]] = Number(row[2]) || 0
    else if (type === 'STATE' && row[1] !== 'balance') {
      const level = Math.max(1, Math.min(3, Number(row[2]) || 1))
      imported.state.balance = Number(row[1]) || 0
      imported.state.careerLevel = level
      imported.state.currentLevel = level
      imported.state.currentWeek = Math.max(1, Number(row[3]) || 1)
      imported.state.academy = { level2: boolValue(row[4]) || level >= 2, level3: boolValue(row[5]) || level >= 3 }
      imported.state.hazmatQualified = boolValue(row[6])
      imported.state.emergencyReserve = version >= 7 ? Math.max(0, Number(row[7]) || 0) : 0
    } else if (type === 'TRIP' && row[1] !== 'id') {
      const modern = row.length >= 13
      imported.state.trips.push(modern ? {
        id: Number(row[1]) || Date.now() + Math.floor(Math.random() * 10000), week: Number(row[2]) || 1, departureAt: row[3] || '', arrivalAt: row[4] || '', date: (row[3] || '').slice(0, 10), origin: row[5] || '', originCompany: row[6] || '—', destination: row[7] || '', destinationCompany: row[8] || '—', cargo: row[9] || '', type: row[10] || 'Loaded', payCategory: row[11] || (String(row[10]).toLowerCase() === 'deadhead' ? 'deadhead' : 'normal'), miles: Number(row[12]) || 0,
      } : {
        id: Number(row[1]) || Date.now() + Math.floor(Math.random() * 10000), week: Number(row[2]) || 1, date: row[3] || '', departureAt: row[3] || '', arrivalAt: '', origin: row[4] || '', originCompany: row[5] || '—', destination: row[6] || '', destinationCompany: row[7] || '—', cargo: row[8] || '', type: row[9] || 'Loaded', payCategory: row[10] && Number.isNaN(Number(row[10])) ? row[10] : (String(row[9]).toLowerCase() === 'deadhead' ? 'deadhead' : 'normal'), miles: Number(row[row.length - 1]) || 0,
      })
    } else if (type === 'HISTORY' && row[1] !== 'date') imported.state.history.push({ date: row[1] || '', type: row[2] || '', desc: row[3] || '', value: Number(row[4]) || 0, amount: Number(row[4]) || 0, balance: Number(row[5]) || 0 })
    else if (type === 'EXPENSE' && row[1] !== 'id') imported.state.customExpenses.push({ id: Number(row[1]) || Date.now() + Math.floor(Math.random() * 10000), name: row[2] || '', value: Number(row[3]) || 0, monthly: boolValue(row[4]) })
    else if (type === 'INCIDENT' && row[1] !== 'id') imported.state.incidents.push({ id: Number(row[1]) || Date.now() + Math.floor(Math.random() * 10000), type: row[2] || 'Infração', date: row[3] || '', time: row[4] || '', route: row[5] || '', description: row[6] || '', amount: Number(row[7]) || 0, chargeMethod: row[8] || 'balance', status: row[9] || '', remaining: Number(row[10]) || 0, createdAt: row[11] || '' })
    else if (type === 'CLOSED_WEEK' && row[1] !== 'week') {
      if (version >= 7) imported.state.closedWeeks.push({ week: Number(row[1]) || 1, closedAt: row[2] || '', miles: Number(row[3]) || 0, level: Number(row[4]) || 1, gross: Number(row[5]) || 0, taxes: Number(row[6]) || 0, benefits: Number(row[7]) || 0, netSalary: Number(row[8]) || 0, perDiem: Number(row[9]) || 0, incidentDeduction: Number(row[10]) || 0, reserveInterest: Number(row[11]) || 0, deposit: Number(row[12]) || 0, desc: row[13] || '' })
      else imported.state.closedWeeks.push({ week: Number(row[1]) || 1, closedAt: row[2] || '', miles: Number(row[3]) || 0, level: Number(row[4]) || 1, gross: Number(row[5]) || 0, taxes: Number(row[6]) || 0, benefits: Number(row[7]) || 0, netSalary: Number(row[8]) || 0, perDiem: Number(row[9]) || 0, incidentDeduction: row.length >= 13 ? Number(row[10]) || 0 : 0, reserveInterest: 0, deposit: Number(row[row.length >= 13 ? 11 : 10]) || 0, desc: row[row.length >= 13 ? 12 : 11] || '' })
    }
  }

  if (!imported.career || !String(imported.career.driverName || '').trim()) throw new Error('A linha CAREER precisa conter o nome do motorista.')
  const setup = Object.keys(imported.setupCosts).length ? { ...DEFAULT_SETUP, ...imported.setupCosts } : { ...DEFAULT_SETUP }
  const setupTotal = Object.values(setup).reduce((sum, value) => sum + (Number(value) || 0), 0)
  const newId = `career_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const initialBalance = Number(imported.career.initialBalance) || 0
  const arrivalBalance = Number(imported.career.arrivalBalance) || initialBalance + setupTotal
  const career = { id: newId, driverName: String(imported.career.driverName).trim(), city: imported.career.city || '', company: imported.career.company || '', arrivalBalance, setupCosts: setup, setupCostsTotal: setupTotal, initialBalance, currentBalance: Number(imported.state.balance ?? initialBalance), currentLevel: imported.state.currentLevel || 1, bio: imported.career.bio || '', createdAt: imported.career.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
  imported.state.careerMiles = imported.state.trips.reduce((sum, trip) => sum + Number(trip.miles || 0), 0)
  if (!Number.isFinite(imported.state.balance)) imported.state.balance = initialBalance
  const careers = loadCareers()
  careers.push(career)
  saveCareers(careers)
  localStorage.setItem(phase1StorageKey(newId), JSON.stringify(imported.state))
  localStorage.setItem('ats_active_career', newId)
  return { career, state: imported.state, version }
}
