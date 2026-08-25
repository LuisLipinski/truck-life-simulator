import { ATS_CITIES } from '../data/atsCities.js'

const IRS_SOURCE = ['IRS — parâmetros federais de 2026', 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill']
const SSA_SOURCE = ['SSA — Social Security e Medicare 2026', 'https://www.ssa.gov/news/en/cola/factsheets/2026.html']
const STATE_TAX_SOURCE = ['Tax Foundation — impostos estaduais 2026', 'https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/']
const BLS_SOURCE = ['BLS — salários estaduais por ocupação', 'https://www.bls.gov/oes/tables.htm']

const BASE_SETUP = { rent: 1650, deposit: 1650, license: 100, groceries: 250, home: 350, phone: 60, internet: 75, transit: 72 }
const BASE_EXPENSES = { rent: 1650, electricity: 100, water: 60, internet: 65, phone: 55, groceries: 400, eatingOut: 150, health: 180, publicTransport: 72, household: 80, leisure: 150 }
const BASE_PAY_RATES = { normal: 0.60, hazmat: 0.63, doubles: 0.64, hazmat_doubles: 0.67, deadhead: 0.50 }

function citiesEndingWith(code) {
  return ATS_CITIES.filter((city) => city.endsWith(`, ${code}`))
}

function scaledRecord(record, factor, precision = 2) {
  const scale = 10 ** precision
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, Math.round(value * factor * scale) / scale]))
}

function stateTaxes(name, incomeTax, payrollTax) {
  const taxes = [
    ['federal', 'Federal Income Tax', 'Estimativa anualizada com faixas federais e dedução-padrão de solteiro para 2026.'],
    ['ss', 'Social Security', '6,2% até o limite anual de salários tributáveis de 2026.'],
    ['medicare', 'Medicare', '1,45%, acrescido da alíquota adicional quando aplicável.'],
  ]
  if (incomeTax) taxes.push(['stateIncomeTax', `${name} Income Tax`, 'Estimativa estadual de 2026; créditos e impostos municipais não são incluídos.'])
  if (payrollTax) taxes.push(['statePayroll', payrollTax.label, payrollTax.description])
  return taxes
}

function makeState(definition) {
  const {
    code, name, placeholder, costFactor, weeklyGross, payFactor = null,
    incomeTax = null, payrollTax = null, perDiem = 80,
  } = definition
  const regionalPayFactor = Number(payFactor) > 0 ? Number(payFactor) : weeklyGross / 960
  return {
    code,
    name,
    stateCode: code,
    stateName: name,
    currency: 'USD',
    currencyLabel: 'US$',
    locale: 'en-US',
    cityPlaceholder: `${placeholder}, ${code}`,
    cities: citiesEndingWith(code),
    defaultArrivalBalance: Math.round(Math.max(3500, 5000 * costFactor) / 50) * 50,
    setupCosts: scaledRecord(BASE_SETUP, costFactor),
    expenses: scaledRecord(BASE_EXPENSES, costFactor),
    payRates: scaledRecord(BASE_PAY_RATES, regionalPayFactor, 4),
    regionalPayFactor,
    level1Gross: weeklyGross,
    routeOverrunRate: Math.round(weeklyGross / 40 * 100) / 100,
    payrollBenefits: 36,
    perDiemRate: perDiem,
    promotionCosts: [300, 59],
    dangerousQualificationCost: 144.25,
    taxModel: 'us-state-2026',
    stateIncomeTax: incomeTax,
    statePayrollTax: payrollTax,
    taxes: stateTaxes(name, incomeTax, payrollTax),
    taxAssumptions: `${name} · estimativa 2026 · pessoa solteira, sem dependentes, dedução-padrão; ${incomeTax ? 'inclui imposto estadual sobre salários' : 'sem imposto estadual sobre salários'}${payrollTax ? `, com ${payrollTax.label}` : ''}; não inclui imposto municipal ou distrital.`,
    financeSources: [IRS_SOURCE, SSA_SOURCE, STATE_TAX_SOURCE, BLS_SOURCE],
  }
}

const flat = (rate, standardDeduction = 16100, personalExemption = 0) => ({ standardDeduction, personalExemption, brackets: [[Infinity, rate]] })

const STATE_DEFINITIONS = [
  { code: 'AZ', name: 'Arizona', placeholder: 'Phoenix', costFactor: 0.78, weeklyGross: 920, incomeTax: flat(0.025, 8350) },
  { code: 'AR', name: 'Arkansas', placeholder: 'Little Rock', costFactor: 0.58, weeklyGross: 810, incomeTax: { standardDeduction: 2470, brackets: [[4600, 0.02], [Infinity, 0.039]] } },
  { code: 'CA', name: 'Califórnia', placeholder: 'Los Angeles', costFactor: 1, weeklyGross: 1080, incomeTax: { standardDeduction: 5540, credit: 153, brackets: [[11079, 0.01], [26264, 0.02], [41452, 0.04], [57542, 0.06], [72724, 0.08], [371479, 0.093], [445771, 0.103], [742953, 0.113], [1000000, 0.123], [Infinity, 0.133]] }, payrollTax: { rate: 0.013, label: 'California SDI', description: 'Contribuição estadual de Disability Insurance usada na simulação para 2026.' }, perDiem: 86 },
  { code: 'CO', name: 'Colorado', placeholder: 'Denver', costFactor: 0.88, weeklyGross: 1040, incomeTax: flat(0.044) },
  { code: 'ID', name: 'Idaho', placeholder: 'Boise', costFactor: 0.72, weeklyGross: 900, incomeTax: { standardDeduction: 16100, brackets: [[4811, 0], [Infinity, 0.053]] } },
  { code: 'IL', name: 'Illinois', placeholder: 'Chicago', costFactor: 0.75, weeklyGross: 990, incomeTax: flat(0.0495, 0, 2925) },
  { code: 'IA', name: 'Iowa', placeholder: 'Des Moines', costFactor: 0.62, weeklyGross: 900, incomeTax: flat(0.038) },
  { code: 'KS', name: 'Kansas', placeholder: 'Wichita', costFactor: 0.62, weeklyGross: 880, incomeTax: { standardDeduction: 3605, personalExemption: 9160, brackets: [[23000, 0.052], [Infinity, 0.0558]] } },
  { code: 'LA', name: 'Louisiana', placeholder: 'New Orleans', costFactor: 0.65, weeklyGross: 880, incomeTax: flat(0.03, 12875) },
  { code: 'MO', name: 'Missouri', placeholder: 'St. Louis', costFactor: 0.65, weeklyGross: 910, incomeTax: { standardDeduction: 16100, brackets: [[1348, 0], [2696, 0.02], [4044, 0.025], [5392, 0.03], [6740, 0.035], [8088, 0.04], [9436, 0.045], [Infinity, 0.047]] } },
  { code: 'MT', name: 'Montana', placeholder: 'Billings', costFactor: 0.72, weeklyGross: 940, incomeTax: { standardDeduction: 16100, brackets: [[47500, 0.047], [Infinity, 0.0565]] } },
  { code: 'NE', name: 'Nebraska', placeholder: 'Omaha', costFactor: 0.65, weeklyGross: 920, incomeTax: { standardDeduction: 8850, credit: 176, brackets: [[4130, 0.0246], [24760, 0.0351], [Infinity, 0.0455]] } },
  { code: 'NV', name: 'Nevada', placeholder: 'Las Vegas', costFactor: 0.82, weeklyGross: 990 },
  { code: 'NM', name: 'Novo México', placeholder: 'Albuquerque', costFactor: 0.65, weeklyGross: 870, incomeTax: { standardDeduction: 16100, brackets: [[5500, 0.015], [16500, 0.032], [33500, 0.043], [66500, 0.047], [210000, 0.049], [Infinity, 0.059]] } },
  { code: 'OK', name: 'Oklahoma', placeholder: 'Oklahoma City', costFactor: 0.60, weeklyGross: 860, incomeTax: { standardDeduction: 6350, personalExemption: 1000, brackets: [[3750, 0], [4900, 0.025], [7200, 0.035], [Infinity, 0.045]] } },
  { code: 'OR', name: 'Oregon', placeholder: 'Portland', costFactor: 0.86, weeklyGross: 1050, incomeTax: { standardDeduction: 2910, credit: 256, brackets: [[4550, 0.0475], [11400, 0.0675], [125000, 0.0875], [Infinity, 0.099]] }, perDiem: 86 },
  { code: 'TX', name: 'Texas', placeholder: 'Dallas', costFactor: 0.70, weeklyGross: 960 },
  { code: 'UT', name: 'Utah', placeholder: 'Salt Lake City', costFactor: 0.78, weeklyGross: 960, incomeTax: flat(0.045) },
  { code: 'WA', name: 'Washington', placeholder: 'Seattle', costFactor: 0.95, weeklyGross: 1100, payrollTax: { rate: 0.0058, label: 'WA Cares Fund', description: 'Contribuição sobre salários do programa estadual de cuidados de longa duração.' }, perDiem: 86 },
  { code: 'WY', name: 'Wyoming', placeholder: 'Cheyenne', costFactor: 0.67, weeklyGross: 950 },
]

export const ATS_STATE_PROFILES = Object.fromEntries(STATE_DEFINITIONS.map((definition) => [definition.code, makeState(definition)]))
export const ATS_STATE_OPTIONS = Object.values(ATS_STATE_PROFILES).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

export function getAtsStateProfile(stateCode) {
  return ATS_STATE_PROFILES[String(stateCode || '').toUpperCase()] || null
}

export function inferAtsStateCode(city) {
  const value = String(city || '').trim()
  return ATS_STATE_OPTIONS.find((state) => state.cities.includes(value))?.code || null
}
