import * as XLSX from 'xlsx'
import { activeCareerStorageKey, loadCareers, saveCareers } from './storage.js'
import { phase1StorageKey, tripDistance } from './phase1.js'
import { gameIdFromBackupMarker, getGame, getGameForCareer } from '../config/games.js'
import { getAtsStateProfile, inferAtsStateCode } from '../config/atsStates.js'
import { getAtsCurrency } from '../config/atsCurrencies.js'
import { getEts2CountryProfile, inferEts2CountryCode } from '../config/ets2Countries.js'
import { getEts2Currency } from '../config/ets2Currencies.js'

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

function backupTripType(type, game) {
  if (game.id === 'ats') return type || 'Loaded'
  return type === 'Deadhead' ? 'Reposicionamento vazio' : 'Com carga'
}

function backupPayCategory(category, game) {
  if (game.id === 'ats') return category || 'normal'
  return ({ normal: 'standard', hazmat: 'adr', doubles: 'euro_combi', hazmat_doubles: 'adr_euro_combi', deadhead: 'empty' })[category] || 'standard'
}

function importedTripType(type) {
  const normalized = String(type || '').trim().toLowerCase()
  return normalized === 'deadhead' || normalized === 'empty' || normalized.includes('reposicionamento') ? 'Deadhead' : 'Loaded'
}

function importedPayCategory(category, type) {
  if (type === 'Deadhead') return 'deadhead'
  return ({ standard: 'normal', adr: 'hazmat', euro_combi: 'doubles', adr_euro_combi: 'hazmat_doubles' })[String(category || '').trim().toLowerCase()] || category || 'normal'
}

function templateRows(gameId = 'ats') {
  const locationCode = gameId === 'ets2' ? 'DE' : 'CA'
  const baseGame = getGame(gameId, locationCode)
  const city = baseGame.baseCities?.[0] || baseGame.cities[0]
  const game = getGame(gameId, locationCode, null, null, null, city)
  const destination = game.baseCities?.[1] || game.cities[1] || city
  const arrivalBalance = game.defaultArrivalBalance ?? 5000
  const initialBalance = arrivalBalance - Object.values(game.setupCosts).reduce((sum, value) => sum + Number(value || 0), 0)
  return [
    [game.backupMarker, '11'],
    instructionsRow(),
    ['CAREER','id','driverName','city','company','arrivalBalance','initialBalance','bio','createdAt','countryCode','countryName','currency','baseCurrency','exchangeRate','exchangeRateAsOf','stateCode','stateName','cityMarketVersion','cityMarketLabel','cityCostFactor','citySalaryFactor'],
    ['CAREER','','Seu Nome',city,'Nome da Empresa',arrivalBalance,initialBalance,'Biografia do personagem','',game.countryCode || '',game.countryName || '',game.currency,game.baseCurrency || game.currency,game.exchangeRate || 1,game.exchangeRateAsOf || '',game.stateCode || '',game.stateName || '',game.cityMarketVersion,game.cityMarketLabel,game.cityCostFactor,game.citySalaryFactor],
    ['SETUP_COST','name','value'],
    ...Object.entries(game.setupCosts).map(([name, value]) => ['SETUP_COST', name, value]),
    ['STATE','balance','careerLevel','currentWeek','academyLevel2','academyLevel3',game.id === 'ats' ? 'hazmatQualified' : 'adrQualified','emergencyReserve','currentPayrollMonth','payPeriodStartWeek','closedOperationalWeeks','autoReserveEnabled','autoReserveAmount'],
    ['STATE',initialBalance,1,1,0,0,0,0,1,1,'',0,0],
    ['BASE_EXPENSE','name','value'],
    ...Object.entries(game.expenses).map(([name, value]) => ['BASE_EXPENSE', name, value]),
    ['TRIP','id','week','departureAt','arrivalAt','origin','originCompany','destination','destinationCompany','cargo','type','payCategory',game.distanceField === 'miles' ? 'miles' : 'kilometers'],
    ['TRIP','',1,'2026-08-19T07:00','2026-08-19T10:00',city,'Filial de origem',destination,'Filial de destino','Alimentos',backupTripType('Loaded', game),backupPayCategory('normal', game),115],
    ['HISTORY','date','type','desc','value','balance'],
    ['EXPENSE','id','name','value','monthly'],
    ['INCIDENT','id','type','date','time','route','description','amount','chargeMethod','status','remaining','createdAt','week'],
    ['CLOSED_WEEK','week','closedAt',game.distanceField === 'miles' ? 'miles' : 'kilometers','level','gross','taxes','benefits','netSalary','perDiem','incidentDeduction','reserveInterest','deposit','desc','periodType','month','startWeek','endWeek','weeks','countryCode','currency','taxBreakdown','baseCurrency','exchangeRate','exchangeRateAsOf','stateCode','stateName','city','cityMarketLabel','cityCostFactor','citySalaryFactor'],
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

function writeWorkbook(rows, filename, gameId = 'ats') {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  worksheet['!cols'] = Array.from({ length: 31 }, (_, index) => ({ wch: index === 7 || index === 21 || index === 28 ? 42 : index < 2 ? 18 : 22 }))
  XLSX.utils.book_append_sheet(workbook, worksheet, getGame(gameId).sheetName)
  // SheetJS infere BIFF8 para .xls e XLSX para .xlsx pelo nome do arquivo.
  XLSX.writeFile(workbook, filename)
}

export function downloadCSVTemplate(gameId = 'ats') {
  const game = getGame(gameId)
  downloadCsv(`modelo_carreira_${game.backupStem}.csv`, templateRows(gameId))
}

export function downloadExcelTemplate(format = 'xlsx', gameId = 'ats') {
  if (!['xls', 'xlsx'].includes(format)) throw new Error('Formato de planilha não suportado.')
  const game = getGame(gameId)
  writeWorkbook(templateRows(gameId), `modelo_carreira_${game.backupStem}.${format}`, gameId)
}

function careerRows(career, state, gameId = career?.gameId || 'ats') {
  if (!career) throw new Error('Carreira não encontrada para exportação.')
  const game = getGameForCareer(career, gameId)
  const safeState = state || {}
  return [
    [game.backupMarker, '11'],
    instructionsRow(),
    ['CAREER','id','driverName','city','company','arrivalBalance','initialBalance','bio','createdAt','countryCode','countryName','currency','baseCurrency','exchangeRate','exchangeRateAsOf','stateCode','stateName','cityMarketVersion','cityMarketLabel','cityCostFactor','citySalaryFactor'],
    ['CAREER',career.id,career.driverName,career.city,career.company,career.arrivalBalance,career.initialBalance,career.bio || career.biography || '',career.createdAt || '',career.countryCode || game.countryCode || '',career.countryName || game.countryName || '',career.currency || game.currency,career.baseCurrency || game.baseCurrency || game.currency,career.exchangeRate || game.exchangeRate || 1,career.exchangeRateAsOf || game.exchangeRateAsOf || '',career.stateCode || game.stateCode || '',career.stateName || game.stateName || '',career.cityMarketVersion || game.cityMarketVersion,career.cityMarketLabel || game.cityMarketLabel,career.cityCostFactor || game.cityCostFactor,career.citySalaryFactor || game.citySalaryFactor],
    ['SETUP_COST','name','value'],
    ...Object.entries({ ...game.setupCosts, ...(career.setupCosts || {}) }).map(([name, value]) => ['SETUP_COST', name, value]),
    ['STATE','balance','careerLevel','currentWeek','academyLevel2','academyLevel3',game.id === 'ats' ? 'hazmatQualified' : 'adrQualified','emergencyReserve','currentPayrollMonth','payPeriodStartWeek','closedOperationalWeeks','autoReserveEnabled','autoReserveAmount'],
    ['STATE',safeState.balance ?? career.currentBalance ?? career.initialBalance ?? 0,safeState.currentLevel || safeState.careerLevel || career.currentLevel || 1,safeState.currentWeek || 1,safeState.academy?.level2 ? 1 : 0,safeState.academy?.level3 ? 1 : 0,(safeState.dangerousGoodsQualified ?? safeState.hazmatQualified) ? 1 : 0,safeState.emergencyReserve || 0,safeState.currentPayrollMonth || 1,safeState.payPeriodStartWeek || 1,(safeState.closedOperationalWeeks || []).join('|'),safeState.autoReserveContribution?.enabled ? 1 : 0,safeState.autoReserveContribution?.amount || 0],
    ['BASE_EXPENSE','name','value'],
    ...Object.entries(safeState.expenses || game.expenses).filter(([name]) => name !== 'emergency').map(([name, value]) => ['BASE_EXPENSE', name, value]),
    ['TRIP','id','week','departureAt','arrivalAt','origin','originCompany','destination','destinationCompany','cargo','type','payCategory',game.distanceField === 'miles' ? 'miles' : 'kilometers'],
    ...(safeState.trips || []).map((trip) => ['TRIP',trip.id,trip.week,trip.departureAt,trip.arrivalAt,trip.origin,trip.originCompany,trip.destination,trip.destinationCompany,trip.cargo,backupTripType(trip.type, game),backupPayCategory(trip.payCategory, game),tripDistance(trip)]),
    ['HISTORY','date','type','desc','value','balance'],
    ...(safeState.history || []).map((item) => ['HISTORY',item.date,item.type,item.desc,item.value ?? item.amount ?? 0,item.balance]),
    ['EXPENSE','id','name','value','monthly'],
    ...(safeState.customExpenses || []).map((item) => ['EXPENSE',item.id,item.name,item.value,item.monthly ? 1 : 0]),
    ['INCIDENT','id','type','date','time','route','description','amount','chargeMethod','status','remaining','createdAt','week'],
    ...(safeState.incidents || []).map((item) => ['INCIDENT',item.id,item.type,item.date,item.time,item.route,item.description,item.amount,item.chargeMethod,item.status,item.remaining,item.createdAt,item.week || '']),
    ['CLOSED_WEEK','week','closedAt',game.distanceField === 'miles' ? 'miles' : 'kilometers','level','gross','taxes','benefits','netSalary','perDiem','incidentDeduction','reserveInterest','deposit','desc','periodType','month','startWeek','endWeek','weeks','countryCode','currency','taxBreakdown','baseCurrency','exchangeRate','exchangeRateAsOf','stateCode','stateName','city','cityMarketLabel','cityCostFactor','citySalaryFactor'],
    ...(safeState.closedWeeks || []).map((period) => ['CLOSED_WEEK',period.week,period.closedAt,period.distance ?? period.miles,period.level,period.gross,period.taxes,period.benefits,period.netSalary,period.perDiem,period.incidentDeduction,period.reserveInterest || 0,period.deposit,period.desc,period.periodType || 'week',period.month || '',period.startWeek || period.week || '',period.endWeek || period.week || '',(period.weeks || [period.week]).filter(Boolean).join('|'),period.countryCode || career.countryCode || '',period.currency || career.currency || game.currency,JSON.stringify(period.taxBreakdown || {}),period.baseCurrency || career.baseCurrency || game.baseCurrency || game.currency,period.exchangeRate || career.exchangeRate || game.exchangeRate || 1,period.exchangeRateAsOf || career.exchangeRateAsOf || game.exchangeRateAsOf || '',period.stateCode || career.stateCode || game.stateCode || '',period.stateName || career.stateName || game.stateName || '',period.city || career.city || game.city || '',period.cityMarketLabel || career.cityMarketLabel || game.cityMarketLabel || '',period.cityCostFactor || career.cityCostFactor || game.cityCostFactor || 1,period.citySalaryFactor || career.citySalaryFactor || game.citySalaryFactor || 1]),
  ]
}

function safeFileStem(career) {
  return String(career?.driverName || 'carreira').trim().replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'carreira'
}

export function exportCareerCSV(career, state, gameId = career?.gameId || 'ats') {
  const game = getGame(gameId)
  downloadCsv(`${game.backupStem}_${safeFileStem(career)}.csv`, careerRows(career, state, gameId))
}

export function exportCareerExcel(career, state, format = 'xlsx', gameId = career?.gameId || 'ats') {
  if (!['xls', 'xlsx'].includes(format)) throw new Error('Formato de planilha não suportado.')
  const game = getGame(gameId)
  writeWorkbook(careerRows(career, state, gameId), `${game.backupStem}_${safeFileStem(career)}.${format}`, gameId)
}

function hasValue(value) {
  return String(value ?? '').trim().length > 0
}

function boolValue(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'sim'
}

function parseWeekList(value) {
  if (!hasValue(value)) return []
  return [...new Set(String(value).split('|').map((week) => Number(week)).filter((week) => Number.isInteger(week) && week > 0))]
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

function validateImportRows(rows, version, game = getGame('ats')) {
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
    if (version >= 8 && game.id === 'ets2') {
      if (!hasValue(row[9])) missing.push(labelAt('CAREER', 'countryCode', careerIndex))
      else if (!getEts2CountryProfile(row[9])) invalid.push(`${labelAt('CAREER', 'countryCode', careerIndex)} (país não suportado)`)
    }
    if (version >= 9 && game.id === 'ets2') {
      if (!hasValue(row[11])) missing.push(labelAt('CAREER', 'currency', careerIndex))
      else if (!getEts2Currency(row[11])) invalid.push(`${labelAt('CAREER', 'currency', careerIndex)} (moeda não suportada)`)
      if (!hasValue(row[12])) missing.push(labelAt('CAREER', 'baseCurrency', careerIndex))
      else if (String(row[12]).toUpperCase() !== game.baseCurrency) invalid.push(`${labelAt('CAREER', 'baseCurrency', careerIndex)} (deve corresponder ao país-sede)`)
      if (!hasValue(row[13])) missing.push(labelAt('CAREER', 'exchangeRate', careerIndex))
      validateNumeric(row[13], labelAt('CAREER', 'exchangeRate', careerIndex), invalid, { min: Number.EPSILON })
      if (!hasValue(row[14])) missing.push(labelAt('CAREER', 'exchangeRateAsOf', careerIndex))
    }
    if (version >= 10 && game.id === 'ats') {
      if (!hasValue(row[11])) missing.push(labelAt('CAREER', 'currency', careerIndex))
      else if (!getAtsCurrency(row[11])) invalid.push(`${labelAt('CAREER', 'currency', careerIndex)} (moeda não suportada no ATS)`)
      if (!hasValue(row[12])) missing.push(labelAt('CAREER', 'baseCurrency', careerIndex))
      else if (String(row[12]).toUpperCase() !== 'USD') invalid.push(`${labelAt('CAREER', 'baseCurrency', careerIndex)} (deve ser USD)`)
      if (!hasValue(row[13])) missing.push(labelAt('CAREER', 'exchangeRate', careerIndex))
      validateNumeric(row[13], labelAt('CAREER', 'exchangeRate', careerIndex), invalid, { min: Number.EPSILON })
      if (!hasValue(row[14])) missing.push(labelAt('CAREER', 'exchangeRateAsOf', careerIndex))
      if (!hasValue(row[15])) missing.push(labelAt('CAREER', 'stateCode', careerIndex))
      else if (!getAtsStateProfile(row[15])) invalid.push(`${labelAt('CAREER', 'stateCode', careerIndex)} (estado não suportado)`)
    }
    if (version >= 11) {
      ;[[17, 'cityMarketVersion'], [18, 'cityMarketLabel'], [19, 'cityCostFactor'], [20, 'citySalaryFactor']].forEach(([column, field]) => {
        if (!hasValue(row[column])) missing.push(labelAt('CAREER', field, careerIndex))
      })
      validateNumeric(row[17], labelAt('CAREER', 'cityMarketVersion', careerIndex), invalid, { integer: true, min: 1 })
      validateNumeric(row[19], labelAt('CAREER', 'cityCostFactor', careerIndex), invalid, { min: Number.EPSILON })
      validateNumeric(row[20], labelAt('CAREER', 'citySalaryFactor', careerIndex), invalid, { min: Number.EPSILON })
    }
  }

  if (stateIndex < 0) missing.push('linha STATE')
  else {
    const row = rows[stateIndex]
    const required = [[1,'balance'],[2,'careerLevel'],[3,'currentWeek']]
    if (version >= 7) required.push([7,'emergencyReserve'])
    if (version >= 8) required.push([8,'currentPayrollMonth'], [9,'payPeriodStartWeek'])
    required.forEach(([column, field]) => { if (!hasValue(row[column])) missing.push(labelAt('STATE', field, stateIndex)) })
    validateNumeric(row[1], labelAt('STATE','balance',stateIndex), invalid)
    validateNumeric(row[2], labelAt('STATE','careerLevel',stateIndex), invalid, { integer: true, min: 1, max: 3 })
    validateNumeric(row[3], labelAt('STATE','currentWeek',stateIndex), invalid, { integer: true, min: 1 })
    if (version >= 7) validateNumeric(row[7], labelAt('STATE','emergencyReserve',stateIndex), invalid, { min: 0 })
    if (version >= 8) {
      validateNumeric(row[8], labelAt('STATE','currentPayrollMonth',stateIndex), invalid, { integer: true, min: 1 })
      validateNumeric(row[9], labelAt('STATE','payPeriodStartWeek',stateIndex), invalid, { integer: true, min: 1 })
      if (hasValue(row[10]) && parseWeekList(row[10]).length !== String(row[10]).split('|').length) invalid.push(`${labelAt('STATE','closedOperationalWeeks',stateIndex)} (use semanas inteiras separadas por |)`)
      validateNumeric(row[12], labelAt('STATE','autoReserveAmount',stateIndex), invalid, { min: 0 })
    }
  }

  rows.forEach((row, index) => {
    const type = String(row[0] || '').trim()
    if (!type || ['ATS_CAREER_BACKUP','ETS2_CAREER_BACKUP','INSTRUCTIONS','CAREER','STATE'].includes(type)) return

    if (type === 'SETUP_COST' && row[1] !== 'name') {
      if (!hasValue(row[1])) missing.push(labelAt(type,'name',index))
      if (!hasValue(row[2])) missing.push(labelAt(type,'value',index))
      validateNumeric(row[2], labelAt(type,'value',index), invalid, { min: 0 })
      return
    }

    if (type === 'BASE_EXPENSE' && row[1] !== 'name') {
      if (!hasValue(row[1])) missing.push(labelAt(type,'name',index))
      if (!hasValue(row[2])) missing.push(labelAt(type,'value',index))
      validateNumeric(row[2], labelAt(type,'value',index), invalid, { min: 0 })
      return
    }

    if (type === 'TRIP' && row[1] !== 'id') {
      validateNumeric(row[1], labelAt(type,'id',index), invalid, { integer: true, min: 1 })
      validateNumeric(row[2], labelAt(type,'week',index), invalid, { integer: true, min: 1 })
      const distanceIndex = row.length >= 13 ? 12 : row.length - 1
      const distanceField = game.distanceField === 'miles' ? 'miles' : 'kilometers'
      if (!hasValue(row[distanceIndex])) missing.push(labelAt(type,distanceField,index))
      validateNumeric(row[distanceIndex], labelAt(type,distanceField,index), invalid, { min: 0.01 })
      return
    }

    if (type === 'HISTORY' && row[1] !== 'date') {
      validateNumeric(row[4], labelAt(type,'value',index), invalid)
      validateNumeric(row[5], labelAt(type,'balance',index), invalid)
      return
    }

    if (type === 'EXPENSE' && row[1] !== 'id') {
      if (!hasValue(row[1])) missing.push(labelAt(type,'id',index))
      if (!hasValue(row[3])) missing.push(labelAt(type,'value',index))
      validateNumeric(row[3], labelAt(type,'value',index), invalid, { min: 0 })
      return
    }

    if (type === 'INCIDENT' && row[1] !== 'id') {
      validateNumeric(row[1], labelAt(type,'id',index), invalid, { integer: true, min: 1 })
      if (!hasValue(row[7])) missing.push(labelAt(type,'amount',index))
      validateNumeric(row[7], labelAt(type,'amount',index), invalid, { min: 0 })
      validateNumeric(row[10], labelAt(type,'remaining',index), invalid, { min: 0 })
      if (version >= 8) validateNumeric(row[12], labelAt(type,'week',index), invalid, { integer: true, min: 1 })
      return
    }

    if (type === 'CLOSED_WEEK' && row[1] !== 'week') {
      validateNumeric(row[1], labelAt(type,'week',index), invalid, { integer: true, min: 1 })
      validateNumeric(row[3], labelAt(type,game.distanceField === 'miles' ? 'miles' : 'kilometers',index), invalid, { min: 0 })
      validateNumeric(row[4], labelAt(type,'level',index), invalid, { integer: true, min: 1, max: 3 })
      const fields = version >= 7
        ? [[5,'gross'],[6,'taxes'],[7,'benefits'],[8,'netSalary'],[9,'perDiem'],[10,'incidentDeduction'],[11,'reserveInterest'],[12,'deposit']]
        : [[5,'gross'],[6,'taxes'],[7,'benefits'],[8,'netSalary'],[9,'perDiem'],[10,'incidentDeduction'],[11,'deposit']]
      fields.forEach(([column, field]) => validateNumeric(row[column], labelAt(type,field,index), invalid))
      if (version >= 8 && row[14] === 'month') {
        if (!hasValue(row[15])) missing.push(labelAt(type, 'month', index))
        if (!hasValue(row[18])) missing.push(labelAt(type, 'weeks', index))
        validateNumeric(row[15], labelAt(type, 'month', index), invalid, { integer: true, min: 1 })
        validateNumeric(row[16], labelAt(type, 'startWeek', index), invalid, { integer: true, min: 1 })
        validateNumeric(row[17], labelAt(type, 'endWeek', index), invalid, { integer: true, min: 1 })
        if (hasValue(row[18]) && parseWeekList(row[18]).length !== String(row[18]).split('|').length) invalid.push(`${labelAt(type, 'weeks', index)} (use semanas inteiras separadas por |)`)
      }
      if (version >= 8 && hasValue(row[21])) {
        try {
          const breakdown = JSON.parse(row[21])
          if (!breakdown || Array.isArray(breakdown) || typeof breakdown !== 'object') throw new Error('invalid')
        } catch {
          invalid.push(`${labelAt(type, 'taxBreakdown', index)} (use um objeto JSON válido)`)
        }
      }
      if (version >= 9 && (game.id === 'ets2' || version >= 10)) {
        if (hasValue(row[22]) && String(row[22]).toUpperCase() !== game.baseCurrency) invalid.push(`${labelAt(type, 'baseCurrency', index)} (deve corresponder à sede fiscal)`)
        validateNumeric(row[23], labelAt(type, 'exchangeRate', index), invalid, { min: Number.EPSILON })
      }
      if (version >= 10 && game.id === 'ats' && hasValue(row[25]) && !getAtsStateProfile(row[25])) invalid.push(`${labelAt(type, 'stateCode', index)} (estado não suportado)`)
      if (version >= 11) {
        ;[[27, 'city'], [28, 'cityMarketLabel'], [29, 'cityCostFactor'], [30, 'citySalaryFactor']].forEach(([column, field]) => {
          if (!hasValue(row[column])) missing.push(labelAt(type, field, index))
        })
        validateNumeric(row[29], labelAt(type, 'cityCostFactor', index), invalid, { min: Number.EPSILON })
        validateNumeric(row[30], labelAt(type, 'citySalaryFactor', index), invalid, { min: Number.EPSILON })
      }
    }
  })

  if (missing.length) throw new Error(`Arquivo incompleto. Campos obrigatórios ausentes: ${[...new Set(missing)].join(', ')}.`)
  if (invalid.length) throw new Error(`Arquivo inválido. Revise estes campos: ${[...new Set(invalid)].join(', ')}.`)
}

function importCareerRows(rows, expectedGameId) {
  const marker = String(rows?.[0]?.[0] || '').trim()
  const gameId = gameIdFromBackupMarker(marker)
  if (!gameId) throw new Error('O arquivo não possui uma identificação de carreira compatível (ATS_CAREER_BACKUP ou ETS2_CAREER_BACKUP).')
  if (expectedGameId && expectedGameId !== gameId) throw new Error(`Este é um backup de ${getGame(gameId).shortName}. Importe-o na área de carreiras desse jogo.`)
  const version = parseStrictNumber(rows[0][1] ?? 1)
  if (!Number.isInteger(version) || version < 1) throw new Error('A versão do backup é inválida.')
  const careerDataRow = rows.find((row) => String(row[0] || '').trim() === 'CAREER' && row[1] !== 'id')
  const countryCode = gameId === 'ets2'
    ? (version >= 8 ? String(careerDataRow?.[9] || '').trim().toUpperCase() : inferEts2CountryCode(careerDataRow?.[3]) || 'DE')
    : null
  const stateCode = gameId === 'ats'
    ? (version >= 10 ? String(careerDataRow?.[15] || '').trim().toUpperCase() : inferAtsStateCode(careerDataRow?.[3]) || 'CA')
    : null
  const currencyCode = gameId === 'ets2' && version >= 8 && getEts2Currency(careerDataRow?.[11])
    ? String(careerDataRow[11]).trim().toUpperCase()
    : gameId === 'ats' && version >= 10 && getAtsCurrency(careerDataRow?.[11])
      ? String(careerDataRow[11]).trim().toUpperCase()
      : null
  const savedExchangeRate = version >= 9 && Number(parseStrictNumber(careerDataRow?.[13])) > 0 ? parseStrictNumber(careerDataRow[13]) : null
  const savedExchangeRateAsOf = version >= 9 ? String(careerDataRow?.[14] || '').trim() : null
  const savedCityMarketLabel = version >= 11 ? String(careerDataRow?.[18] || '').trim() : null
  const savedCityCostFactor = version >= 11 && Number(parseStrictNumber(careerDataRow?.[19])) > 0 ? parseStrictNumber(careerDataRow[19]) : null
  const savedCitySalaryFactor = version >= 11 && Number(parseStrictNumber(careerDataRow?.[20])) > 0 ? parseStrictNumber(careerDataRow[20]) : null
  const game = getGame(
    gameId,
    gameId === 'ets2' ? countryCode : stateCode,
    currencyCode,
    savedExchangeRate,
    savedExchangeRateAsOf,
    careerDataRow?.[3],
    savedCityCostFactor,
    savedCitySalaryFactor,
    savedCityMarketLabel,
  )
  validateImportRows(rows, version, game)

  const imported = {
    career: null,
    setupCosts: {},
    state: { balance: 0, emergencyReserve: 0, expenses: { ...game.expenses }, history: [], careerMiles: 0, careerLevel: 1, currentLevel: 1, trips: [], customExpenses: [], currentWeek: 1, currentPayrollMonth: 1, payPeriodStartWeek: 1, closedOperationalWeeks: [], closedWeeks: [], incidents: [], academy: { level2: false, level3: false }, hazmatQualified: false, autoReserveContribution: { enabled: false, amount: 0 } },
  }

  for (const row of rows.slice(1)) {
    const type = String(row[0] || '').trim()
    if (type === 'CAREER' && row[1] !== 'id') {
      imported.career = {
        driverName: row[2] || '', city: row[3] || '', company: row[4] || '', arrivalBalance: parseStrictNumber(row[5]), initialBalance: parseStrictNumber(row[6]),
        bio: row[7] || '', createdAt: version <= 1 ? new Date().toISOString() : (row[8] || new Date().toISOString()),
        countryCode: game.countryCode || '', countryName: game.countryName || '', currency: game.currency,
        stateCode: game.stateCode || '', stateName: game.stateName || '',
        baseCurrency: game.baseCurrency || game.currency, exchangeRate: game.exchangeRate || 1, exchangeRateAsOf: game.exchangeRateAsOf || '',
        cityMarketVersion: game.cityMarketVersion, cityMarketLabel: game.cityMarketLabel,
        cityCostFactor: game.cityCostFactor, citySalaryFactor: game.citySalaryFactor,
      }
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
      imported.state.dangerousGoodsQualified = imported.state.hazmatQualified
      imported.state.emergencyReserve = version >= 7 ? parseStrictNumber(row[7]) : 0
      imported.state.currentPayrollMonth = version >= 8 ? parseStrictNumber(row[8]) : 1
      imported.state.payPeriodStartWeek = version >= 8 ? parseStrictNumber(row[9]) : 1
      imported.state.closedOperationalWeeks = version >= 8 ? parseWeekList(row[10]) : []
      imported.state.autoReserveContribution = version >= 8 ? { enabled: boolValue(row[11]), amount: hasValue(row[12]) ? parseStrictNumber(row[12]) : 0 } : { enabled: false, amount: 0 }
    } else if (type === 'BASE_EXPENSE' && row[1] && row[1] !== 'name') {
      imported.state.expenses[row[1]] = parseStrictNumber(row[2])
    } else if (type === 'TRIP' && row[1] !== 'id') {
      const modern = row.length >= 13
      const generatedId = Date.now() + Math.floor(Math.random() * 10000)
      const normalizedType = importedTripType(modern ? row[10] : row[9])
      imported.state.trips.push(modern ? {
        id: hasValue(row[1]) ? parseStrictNumber(row[1]) : generatedId,
        week: parseStrictNumber(row[2]) || 1,
        departureAt: row[3] || '', arrivalAt: row[4] || '', date: String(row[3] || '').slice(0, 10),
        origin: row[5] || '', originCompany: row[6] || '—', destination: row[7] || '', destinationCompany: row[8] || '—', cargo: row[9] || '',
        type: normalizedType, payCategory: importedPayCategory(row[11], normalizedType), [game.distanceField]: parseStrictNumber(row[12]),
      } : {
        id: hasValue(row[1]) ? parseStrictNumber(row[1]) : generatedId,
        week: parseStrictNumber(row[2]) || 1,
        date: row[3] || '', departureAt: row[3] || '', arrivalAt: '', origin: row[4] || '', originCompany: row[5] || '—', destination: row[6] || '', destinationCompany: row[7] || '—', cargo: row[8] || '',
        type: normalizedType, payCategory: importedPayCategory(row[10] && Number.isNaN(parseStrictNumber(row[10])) ? row[10] : '', normalizedType), [game.distanceField]: parseStrictNumber(row[row.length - 1]),
      })
    } else if (type === 'HISTORY' && row[1] !== 'date') {
      const value = hasValue(row[4]) ? parseStrictNumber(row[4]) : 0
      imported.state.history.push({ date: row[1] || '', type: row[2] || '', desc: row[3] || '', value, amount: value, balance: hasValue(row[5]) ? parseStrictNumber(row[5]) : 0 })
    } else if (type === 'EXPENSE' && row[1] !== 'id') {
      imported.state.customExpenses.push({ id: hasValue(row[1]) ? row[1] : `exp_${Date.now()}_${Math.floor(Math.random() * 10000)}`, name: row[2] || '', value: parseStrictNumber(row[3]), monthly: boolValue(row[4]) })
    } else if (type === 'INCIDENT' && row[1] !== 'id') {
      imported.state.incidents.push({ id: hasValue(row[1]) ? parseStrictNumber(row[1]) : Date.now() + Math.floor(Math.random() * 10000), type: row[2] || 'Infração', date: row[3] || '', time: row[4] || '', route: row[5] || '', description: row[6] || '', amount: parseStrictNumber(row[7]), chargeMethod: row[8] || 'balance', status: row[9] || '', remaining: hasValue(row[10]) ? parseStrictNumber(row[10]) : 0, createdAt: row[11] || '', week: version >= 8 && hasValue(row[12]) ? parseStrictNumber(row[12]) : undefined })
    } else if (type === 'CLOSED_WEEK' && row[1] !== 'week') {
      const n = (column, fallback = 0) => hasValue(row[column]) ? parseStrictNumber(row[column]) : fallback
      const closed = version >= 8
        ? { week: n(1,1), closedAt: row[2] || '', level: n(4,1), gross: n(5), taxes: n(6), benefits: n(7), netSalary: n(8), perDiem: n(9), incidentDeduction: n(10), reserveInterest: n(11), deposit: n(12), desc: row[13] || '', periodType: row[14] || 'week', month: hasValue(row[15]) ? n(15) : undefined, startWeek: n(16,n(1,1)), endWeek: n(17,n(1,1)), weeks: parseWeekList(row[18]).length ? parseWeekList(row[18]) : [n(1,1)], countryCode: row[19] || game.countryCode || '', currency: row[20] || game.currency, taxBreakdown: (() => { try { return JSON.parse(row[21] || '{}') } catch { return {} } })(), baseCurrency: version >= 9 ? (row[22] || game.baseCurrency || game.currency) : (game.baseCurrency || game.currency), exchangeRate: version >= 9 && hasValue(row[23]) ? n(23, game.exchangeRate || 1) : (game.exchangeRate || 1), exchangeRateAsOf: version >= 9 ? (row[24] || game.exchangeRateAsOf || '') : (game.exchangeRateAsOf || ''), stateCode: version >= 10 ? (row[25] || game.stateCode || '') : (game.stateCode || ''), stateName: version >= 10 ? (row[26] || game.stateName || '') : (game.stateName || ''), city: version >= 11 ? (row[27] || game.city || '') : (game.city || ''), cityMarketLabel: version >= 11 ? (row[28] || game.cityMarketLabel || '') : (game.cityMarketLabel || ''), cityCostFactor: version >= 11 && hasValue(row[29]) ? n(29, game.cityCostFactor || 1) : (game.cityCostFactor || 1), citySalaryFactor: version >= 11 && hasValue(row[30]) ? n(30, game.citySalaryFactor || 1) : (game.citySalaryFactor || 1) }
        : version >= 7
        ? { week: n(1,1), closedAt: row[2] || '', level: n(4,1), gross: n(5), taxes: n(6), benefits: n(7), netSalary: n(8), perDiem: n(9), incidentDeduction: n(10), reserveInterest: n(11), deposit: n(12), desc: row[13] || '' }
        : { week: n(1,1), closedAt: row[2] || '', level: n(4,1), gross: n(5), taxes: n(6), benefits: n(7), netSalary: n(8), perDiem: n(9), incidentDeduction: row.length >= 13 ? n(10) : 0, reserveInterest: 0, deposit: n(row.length >= 13 ? 11 : 10), desc: row[row.length >= 13 ? 12 : 11] || '' }
      closed[game.distanceField] = n(3)
      imported.state.closedWeeks.push(closed)
    }
  }

  const setup = Object.keys(imported.setupCosts).length ? { ...game.setupCosts, ...imported.setupCosts } : { ...game.setupCosts }
  const setupTotal = Object.values(setup).reduce((sum, value) => sum + Number(value || 0), 0)
  const newId = `career_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const career = {
    id: newId,
    gameId,
    driverName: String(imported.career.driverName).trim(), city: String(imported.career.city).trim(), company: String(imported.career.company).trim(),
    arrivalBalance: imported.career.arrivalBalance, setupCosts: setup, setupCostsTotal: setupTotal, initialBalance: imported.career.initialBalance,
    currentBalance: imported.state.balance, currentLevel: imported.state.currentLevel || 1, bio: imported.career.bio || '',
    countryCode: game.countryCode || '', countryName: game.countryName || '', currency: game.currency,
    stateCode: game.stateCode || '', stateName: game.stateName || '',
    baseCurrency: game.baseCurrency || game.currency, exchangeRate: game.exchangeRate || 1, exchangeRateAsOf: game.exchangeRateAsOf || '',
    cityMarketVersion: game.cityMarketVersion, cityMarketLabel: game.cityMarketLabel,
    cityCostFactor: game.cityCostFactor, citySalaryFactor: game.citySalaryFactor,
    createdAt: imported.career.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  if (game.payrollPeriod === 'monthly' && imported.state.closedOperationalWeeks.length === 0) {
    imported.state.closedOperationalWeeks = [...new Set(imported.state.closedWeeks.flatMap((period) => period.weeks || [period.week]).map(Number).filter(Number.isFinite))]
  }
  if (game.payrollPeriod === 'monthly' && version < 8 && imported.state.closedWeeks.length > 0) {
    imported.state.currentPayrollMonth = imported.state.closedWeeks.length + 1
    imported.state.payPeriodStartWeek = imported.state.currentWeek
  }
  imported.state.careerMiles = imported.state.trips.reduce((sum, trip) => sum + tripDistance(trip), 0)
  const careers = loadCareers(gameId)
  careers.push(career)
  saveCareers(careers, gameId)
  localStorage.setItem(phase1StorageKey(newId, gameId), JSON.stringify(imported.state))
  localStorage.setItem(activeCareerStorageKey(gameId), newId)
  return { career, state: imported.state, version, gameId }
}

export function importCareerCSVText(text, expectedGameId) {
  return importCareerRows(parseCSV(text), expectedGameId)
}

export function importCareerWorkbookData(data, expectedGameId) {
  const workbook = XLSX.read(data, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('A planilha não possui nenhuma aba para importar.')
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: '' })
  return importCareerRows(rows.filter((row) => row.some((value) => hasValue(value))), expectedGameId)
}

export async function importCareerFile(file, expectedGameId) {
  if (!file) throw new Error('Nenhum arquivo foi selecionado.')
  const extension = String(file.name || '').split('.').pop().toLowerCase()
  if (!SUPPORTED_FORMATS.includes(extension)) throw new Error('Formato não suportado. Use CSV, XLS ou XLSX.')
  if (extension === 'csv') return importCareerCSVText(await file.text(), expectedGameId)
  return importCareerWorkbookData(await file.arrayBuffer(), expectedGameId)
}
